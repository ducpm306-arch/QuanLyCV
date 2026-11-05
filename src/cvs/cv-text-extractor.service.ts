import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import mammoth from 'mammoth';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { AiService } from '../ai/ai.service.js';

const supportedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

type TikaMetadata = Record<string, unknown>;

@Injectable()
export class CvTextExtractorService {
  private readonly logger = new Logger(CvTextExtractorService.name);
  private readonly serverUrl: string;
  private readonly timeoutMs: number;

  constructor(
    config: ConfigService,
    private readonly aiService: AiService,
  ) {
    this.serverUrl = (
      config.get<string>('TIKA_SERVER_URL') ?? 'http://localhost:9998'
    ).replace(/\/+$/, '');
    const configuredTimeout = Number(config.get<string>('TIKA_TIMEOUT_MS'));
    this.timeoutMs =
      Number.isSafeInteger(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 180000;
  }

  async extract(filePath: string, mimeType: string) {
    if (!supportedMimeTypes.has(mimeType)) {
      throw new UnsupportedMediaTypeException('Chỉ hỗ trợ PDF, DOC và DOCX');
    }

    const file = await readFile(filePath);
    try {
      const text = await this.extractWithTika(file, mimeType);
      if (text) return text;
      this.logger.warn(
        'Apache Tika returned no text; trying the local extractor',
      );
    } catch (error) {
      this.logger.warn(
        `Apache Tika could not process the file: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      if (
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.ms-word'
      ) {
        throw new BadGatewayException(
          'File DOC cũ cần Apache Tika Server. Hãy khởi chạy Tika/Tesseract hoặc chuyển file sang DOCX.',
        );
      }
    }

    let text: string;
    if (mimeType === 'application/pdf') {
      text = await this.extractPdf(file);
    } else if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await this.extractDocx(filePath);
    } else {
      throw new BadGatewayException('Không thể trích xuất nội dung CV');
    }

    if (!text.trim()) {
      throw new BadRequestException('Không đọc được nội dung CV');
    }

    return text.trim();
  }

  private async extractWithTika(file: Buffer, mimeType: string) {
    let response: Response;
    try {
      response = await fetch(`${this.serverUrl}/rmeta`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': mimeType,
          'X-Tika-OCRLanguage': 'vie+eng',
          'X-Tika-PDFOcrStrategy': 'ocr_and_text_extraction',
        },
        body: Uint8Array.from(file).buffer,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new Error('Apache Tika is unavailable');
    }

    if (!response.ok) {
      throw new Error(`Apache Tika failed with HTTP ${response.status}`);
    }

    let metadata: TikaMetadata[] | TikaMetadata;
    try {
      metadata = (await response.json()) as TikaMetadata[] | TikaMetadata;
    } catch {
      throw new Error('Apache Tika returned invalid metadata');
    }
    const documents = Array.isArray(metadata) ? metadata : [metadata];
    return documents
      .map((document) => document['X-TIKA:content'])
      .filter((content): content is string => typeof content === 'string')
      .join('\n\n')
      .trim();
  }

  private async extractPdf(buffer: Buffer) {
    const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText.length >= 80) {
        pages.push(pageText);
        continue;
      }

      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      try {
        await page.render({
          canvasContext: canvas.getContext('2d') as any,
          viewport,
          canvas: canvas as any,
        } as any).promise;
        const ocrText = await this.aiService.ocrImage(
          canvas.toBuffer('image/png'),
        );
        pages.push([pageText, ocrText].filter(Boolean).join('\n'));
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    return pages.join('\n\n');
  }

  private async extractDocx(filePath: string) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
}
