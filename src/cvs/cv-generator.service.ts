import {
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Cv } from './entities/cv.entity.js';

const execFileAsync = promisify(execFile);
const templatePath = join(
  process.cwd(),
  'templates',
  'company-cv-template.docx',
);
const outputRoot = join(process.cwd(), 'uploads', 'cvs', 'generated');
const wordNamespace =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

@Injectable()
export class CvGeneratorService {
  async generate(cv: Cv, cvId: string) {
    if (!cv.extractedData) {
      throw new NotFoundException('CV chưa có dữ liệu trích xuất để tạo file');
    }
    if (!cv.review) {
      throw new NotFoundException('CV chưa có nhận xét đánh giá để tạo file');
    }

    const destination = join(outputRoot, cvId);
    await mkdir(destination, { recursive: true });

    const docxPath = join(destination, 'cv.docx');
    const pdfPath = join(destination, 'cv.pdf');
    const extracted = cv.extractedData;
    const review = cv.review;

    const values: Record<string, string> = {
      'Tên:': this.value(extracted.name),
      'Vị trí ứng tuyển:': this.value(extracted.position),
      'Tech Stacks:': this.value(extracted.tech_stacks),
      'Kinh nghiệm:': this.value(extracted.experience_years, ' năm'),
      'Email:': this.value(extracted.email),
      'SĐT:': this.value(extracted.phone_number),
      'Nhận xét:': this.value(review.summary),
    };

    let source: Buffer;
    try {
      source = await readFile(process.env.CV_TEMPLATE_PATH || templatePath);
    } catch {
      throw new NotFoundException(
        'Không tìm thấy template templates/company-cv-template.docx',
      );
    }
    const zip = await JSZip.loadAsync(source);
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new NotFoundException('Template không có nội dung Word hợp lệ');
    }

    const xml = await documentXml.async('string');
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const tables = document.getElementsByTagNameNS(wordNamespace, 'tbl');

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const rows = tables
        .item(tableIndex)
        ?.getElementsByTagNameNS(wordNamespace, 'tr');
      if (!rows) continue;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const cells = rows
          .item(rowIndex)
          ?.getElementsByTagNameNS(wordNamespace, 'tc');
        if (!cells || cells.length < 2) continue;

        const label = this.cellText(cells.item(1));
        const matchingLabel = Object.keys(values).find((key) =>
          label.trim().startsWith(key),
        );
        if (!matchingLabel) continue;

        this.setCellText(
          cells.item(1),
          matchingLabel === 'Nhận xét:'
            ? values[matchingLabel]
            : `${matchingLabel} ${values[matchingLabel]}`,
        );
      }
    }

    zip.file(
      'word/document.xml',
      new XMLSerializer().serializeToString(document),
    );
    await writeFile(docxPath, await zip.generateAsync({ type: 'nodebuffer' }));

    try {
      const converter = process.env.DOCX_TO_PDF_BIN || 'soffice';
      await execFileAsync(converter, [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        destination,
        docxPath,
      ]);
    } catch {
      throw new ServiceUnavailableException(
        `Đã tạo DOCX tại ${basename(docxPath)} nhưng chưa chuyển được PDF. Cài LibreOffice hoặc cấu hình DOCX_TO_PDF_BIN.`,
      );
    }

    try {
      await stat(pdfPath);
    } catch {
      throw new InternalServerErrorException(
        'LibreOffice chạy xong nhưng không tạo được file PDF',
      );
    }
    return {
      docx: join('uploads', 'cvs', 'generated', cvId, 'cv.docx'),
      pdf: join('uploads', 'cvs', 'generated', cvId, 'cv.pdf'),
    };
  }

  generatedPath(cvId: string, format: 'docx' | 'pdf') {
    return join(outputRoot, cvId, `cv.${format}`);
  }

  private value(value: unknown, suffix = ''): string {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) {
      return value
        .map((item) => this.value(item))
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return `${value}${suffix}`;
    }
    if (typeof value === 'boolean') return String(value);
    return JSON.stringify(value) ?? '';
  }

  private cellText(cell: Element | null) {
    if (!cell) return '';
    return Array.from(cell.getElementsByTagNameNS(wordNamespace, 't'))
      .map((node) => node.textContent ?? '')
      .join('');
  }

  private setCellText(cell: Element | null, text: string) {
    if (!cell) return;
    const textNodes = Array.from(
      cell.getElementsByTagNameNS(wordNamespace, 't'),
    );
    if (textNodes.length === 0) return;

    textNodes[0].textContent = text;
    textNodes[0].setAttributeNS(
      'http://www.w3.org/XML/1998/namespace',
      'xml:space',
      'preserve',
    );
    for (const node of textNodes.slice(1)) node.textContent = '';
  }
}
