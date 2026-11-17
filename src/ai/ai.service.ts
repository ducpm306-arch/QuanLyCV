import { BadGatewayException, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  CvReviewSchema,
  ExtractedCvSchema,
  OcrTextSchema,
} from './schemas/extracted-cv.schema.js';
import { extractCvPrompt, ocrPrompt, reviewCvPrompt } from './ai-prompts.js';

@Injectable()
export class AiService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      baseURL: config.getOrThrow<string>('AI_BASE_URL'),
      apiKey: config.getOrThrow<string>('AI_API_KEY'),
    });

    this.model = config.getOrThrow<string>('AI_MODEL');
  }

  async extractCv(cvText: string) {
    // The configured server is OpenAI-compatible, so use the SDK's Chat Completions API.
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: extractCvPrompt,
        },
        {
          role: 'user',
          content: cvText,
        },
      ],
    });

    const content = response.choices[0]?.message.content;

    if (!content) {
      throw new BadGatewayException('AI không trả về dữ liệu');
    }

    try {
      return ExtractedCvSchema.parse(JSON.parse(content));
    } catch {
      throw new BadGatewayException('AI trả về không đúng dữ liệu');
    }
  }

  async reviewCv(
    cvText: string,
    jobDescription: string,
    allowedTechStacks: string[],
  ) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: reviewCvPrompt,
        },
        {
          role: 'user',
          content: `TECH STACKS ĐƯỢC PHÉP CHO VỊ TRÍ:\n${allowedTechStacks.length ? allowedTechStacks.join(', ') : '(chưa cấu hình)'}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCV:\n${cvText}`,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new BadGatewayException('AI không trả về nhận xét');
    }

    try {
      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected a JSON object');
      }

      const review = parsed as Record<string, unknown>;
      if (Array.isArray(review.criteria)) {
        const criteria: Record<string, unknown>[] = [];

        for (const item of review.criteria) {
          const criterion = item as Record<string, unknown>;

          if (typeof criterion.evidence === 'string') {
            const evidence = criterion.evidence;
            if (evidence.trim()) {
              criterion.evidence = [evidence];
            } else {
              criterion.evidence = [];
            }
          }

          criteria.push(criterion);
        }

        review.criteria = criteria;
      }
      return CvReviewSchema.parse(review);
    } catch {
      throw new BadGatewayException('AI trả về nhận xét không đúng cấu trúc');
    }
  }

  async ocrImage(image: Buffer) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: ocrPrompt,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Đọc nội dung chữ trong ảnh này.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${image.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new BadGatewayException('AI không trả về OCR');
    }

    try {
      return OcrTextSchema.parse(JSON.parse(content)).text;
    } catch {
      throw new BadGatewayException('AI trả về OCR không đúng cấu trúc');
    }
  }
}
