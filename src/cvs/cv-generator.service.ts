import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Cv } from './entities/cv.entity.js';
import { extractCandidatePhoto } from './cv-photo-extractor.js';
import { AiService } from '../ai/ai.service.js';
import { renderCvPdf } from './cv-pdf.js';

const execFileAsync = promisify(execFile);
const templatePath = join(
  process.cwd(),
  'templates',
  'company-cv-template.docx',
);
const outputRoot = join(process.cwd(), 'uploads', 'cvs', 'generated');
const wordNamespace =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const packageRelationshipNamespace =
  'http://schemas.openxmlformats.org/package/2006/relationships';
const contentTypeNamespace =
  'http://schemas.openxmlformats.org/package/2006/content-types';

@Injectable()
export class CvGeneratorService {
  private readonly logger = new Logger(CvGeneratorService.name);

  constructor(private readonly aiService?: AiService) {}

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
    const values = this.values(cv);

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

    // DOCX stores table text in XML nodes, so the template is updated cell by cell.
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const rows = tables
        .item(tableIndex)
        ?.getElementsByTagNameNS(wordNamespace, 'tr');
      if (!rows) continue;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const cells = rows
          .item(rowIndex)
          ?.getElementsByTagNameNS(wordNamespace, 'tc');
        if (!cells?.length) continue;

        const targetCell = cells.item(cells.length > 1 ? 1 : 0);
        const label = this.cellText(targetCell);
        let matchingLabel = '';
        for (const key of Object.keys(values)) {
          if (label.trim().startsWith(key)) {
            matchingLabel = key;
            break;
          }
        }
        if (!matchingLabel) continue;

        this.setCellText(
          targetCell,
          `${matchingLabel} ${values[matchingLabel]}`,
        );
      }
    }

    let photo: Buffer | null = null;
    if (cv.file) {
      try {
        const originalPath = join(process.cwd(), 'uploads', 'cvs', cv.file);
        photo = await extractCandidatePhoto(
          originalPath,
          cv.mimeType,
          this.aiService?.locateCandidatePhoto.bind(this.aiService),
        );
        if (photo) await this.addPhoto(zip, document, photo);
      } catch (error) {
        this.logger.warn(
          `Could not copy candidate photo: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    zip.file(
      'word/document.xml',
      new XMLSerializer().serializeToString(document),
    );
    await writeFile(docxPath, await zip.generateAsync({ type: 'nodebuffer' }));

    let pdfAvailable = false;
    const pdfPath = join(destination, 'cv.pdf');
    await rm(pdfPath, { force: true });
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
      await stat(pdfPath);
      pdfAvailable = true;
    } catch (error) {
      this.logger.warn(
        `LibreOffice PDF conversion failed; using built-in PDF renderer: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      await writeFile(pdfPath, await renderCvPdf(values, photo));
      pdfAvailable = true;
    }
    return {
      docx: join('uploads', 'cvs', 'generated', cvId, 'cv.docx'),
      pdf: pdfAvailable
        ? join('uploads', 'cvs', 'generated', cvId, 'cv.pdf')
        : null,
    };
  }

  generatedPath(cvId: string, format: 'docx' | 'pdf') {
    return join(outputRoot, cvId, `cv.${format}`);
  }

  async ensurePdf(cv: Cv, cvId: string) {
    if (!cv.extractedData || !cv.review) {
      throw new NotFoundException('CV chưa có dữ liệu để tạo PDF');
    }
    const docxPath = this.generatedPath(cvId, 'docx');
    await stat(docxPath);
    let photo: Buffer | null = null;
    try {
      photo = await extractCandidatePhoto(
        docxPath,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    } catch (error) {
      this.logger.warn(
        `Could not read candidate photo for PDF: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
    await writeFile(
      this.generatedPath(cvId, 'pdf'),
      await renderCvPdf(this.values(cv), photo),
    );
    return join('uploads', 'cvs', 'generated', cvId, 'cv.pdf');
  }

  private values(cv: Cv): Record<string, string> {
    const extracted = cv.extractedData!;
    const review = cv.review!;
    return {
      'Tên:': this.value(extracted.name),
      'Vị trí ứng tuyển:': this.value(extracted.position),
      'Tech Stacks:': this.value(extracted.tech_stacks),
      'Kinh nghiệm:': this.value(extracted.experience_years ?? 0, ' năm'),
      'Email:': this.value(extracted.email),
      'SĐT:': this.value(extracted.phone_number),
      'Nhận xét:': this.value(extracted.review || review.summary),
    };
  }

  private async addPhoto(zip: JSZip, document: Document, photo: Buffer) {
    const firstCell = document.getElementsByTagNameNS(wordNamespace, 'tc').item(0);
    const paragraph = firstCell?.getElementsByTagNameNS(wordNamespace, 'p').item(0);
    const relationshipsFile = zip.file('word/_rels/document.xml.rels');
    const contentTypesFile = zip.file('[Content_Types].xml');
    if (!paragraph || !relationshipsFile || !contentTypesFile) return;

    const relationships = new DOMParser().parseFromString(
      await relationshipsFile.async('string'), 'application/xml',
    );
    const existingIds = Array.from(
      relationships.getElementsByTagNameNS(packageRelationshipNamespace, 'Relationship'),
    ).map((item) => item.getAttribute('Id'));
    let relationshipNumber = 1;
    while (existingIds.includes(`rId${relationshipNumber}`)) relationshipNumber += 1;
    const relationshipId = `rId${relationshipNumber}`;
    const relation = relationships.createElementNS(
      packageRelationshipNamespace, 'Relationship',
    );
    relation.setAttribute('Id', relationshipId);
    relation.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
    relation.setAttribute('Target', 'media/candidate-photo.png');
    relationships.documentElement.appendChild(relation);

    const contentTypes = new DOMParser().parseFromString(
      await contentTypesFile.async('string'), 'application/xml',
    );
    const hasPngType = Array.from(
      contentTypes.getElementsByTagNameNS(contentTypeNamespace, 'Default'),
    ).some((item) => item.getAttribute('Extension') === 'png');
    if (!hasPngType) {
      const type = contentTypes.createElementNS(contentTypeNamespace, 'Default');
      type.setAttribute('Extension', 'png');
      type.setAttribute('ContentType', 'image/png');
      contentTypes.documentElement.appendChild(type);
    }

    const drawing = new DOMParser().parseFromString(`
      <w:r xmlns:w="${wordNamespace}"
           xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="1097280" cy="1316736"/>
          <wp:docPr id="1" name="Candidate photo"/>
          <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr><pic:cNvPr id="1" name="Candidate photo"/><pic:cNvPicPr/></pic:nvPicPr>
              <pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
              <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1097280" cy="1316736"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
            </pic:pic>
          </a:graphicData></a:graphic>
        </wp:inline></w:drawing>
      </w:r>`, 'application/xml');
    paragraph.appendChild(document.importNode(drawing.documentElement, true));

    zip.file('word/media/candidate-photo.png', photo);
    zip.file('word/_rels/document.xml.rels', new XMLSerializer().serializeToString(relationships));
    zip.file('[Content_Types].xml', new XMLSerializer().serializeToString(contentTypes));
  }

  private value(value: unknown, suffix = ''): string {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) {
      const values: string[] = [];
      for (const item of value) {
        const text = this.value(item);
        if (text) {
          values.push(text);
        }
      }
      return values.join(', ');
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return `${value}${suffix}`;
    }
    if (typeof value === 'boolean') return String(value);
    return JSON.stringify(value) ?? '';
  }

  private cellText(cell: Element | null) {
    if (!cell) return '';
    const textNodes = Array.from(
      cell.getElementsByTagNameNS(wordNamespace, 't'),
    );
    let text = '';
    for (const node of textNodes) {
      text += node.textContent || '';
    }
    return text;
  }

  private setCellText(cell: Element | null, text: string) {
    if (!cell) return;
    const textNodes = Array.from(
      cell.getElementsByTagNameNS(wordNamespace, 't'),
    );
    if (textNodes.length === 0) return;

    const firstTextNode = textNodes[0];
    firstTextNode.textContent = '';
    for (const node of textNodes.slice(1)) {
      node.parentNode?.removeChild(node);
    }

    let currentNode: Node = firstTextNode;
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      if (index > 0) {
        const lineBreak = cell.ownerDocument.createElementNS(
          wordNamespace,
          'w:br',
        );
        currentNode.parentNode?.insertBefore(
          lineBreak,
          currentNode.nextSibling,
        );
        currentNode = lineBreak;
      }

      const textNode =
        index === 0
          ? firstTextNode
          : cell.ownerDocument.createElementNS(wordNamespace, 'w:t');
      textNode.textContent = lines[index];
      textNode.setAttributeNS(
        'http://www.w3.org/XML/1998/namespace',
        'xml:space',
        'preserve',
      );
      if (index > 0) {
        currentNode.parentNode?.insertBefore(textNode, currentNode.nextSibling);
      }
      currentNode = textNode;
    }
  }
}
