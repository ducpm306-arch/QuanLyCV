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

  async locateCandidatePhoto(image: Buffer) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Find the applicant portrait photo on this CV page. Return only JSON with x, y, width, height as numbers between 0 and 1 relative to the page. If no clear applicant portrait exists, return {"x":0,"y":0,"width":0,"height":0}. Do not select logos, icons, or the entire page.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Locate the applicant portrait.' },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${image.toString('base64')}` },
            },
          ],
        },
      ],
    });
    try {
      const box = JSON.parse(response.choices[0]?.message.content || '') as Record<string, unknown>;
      const { x, y, width, height } = box;
      if (
        [x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value)) &&
        (x as number) >= 0 && (y as number) >= 0 &&
        (width as number) >= 0.06 && (height as number) >= 0.06 &&
        (x as number) + (width as number) <= 1 &&
        (y as number) + (height as number) <= 1 &&
        (width as number) <= 0.45 && (height as number) <= 0.5
      ) return box as { x: number; y: number; width: number; height: number };
    } catch {
      // A missing or malformed box means the page has no usable portrait.
    }
    return null;
  }
}
