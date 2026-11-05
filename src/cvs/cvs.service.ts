import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cv } from './entities/cv.entity.js';
import { isValidObjectId, Model } from 'mongoose';
import { join } from 'node:path';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import { AiService } from '../ai/ai.service.js';
import { Applicant } from '../applicants/entities/applicant.entity.js';
import { CvGeneratorService } from './cv-generator.service.js';
import { access } from 'node:fs/promises';
import { Position } from '../positions/entities/position.entity.js';
import { ExtractedCvSchema } from '../ai/schemas/extracted-cv.schema.js';

@Injectable()
export class CvsService {
  constructor(
    @InjectModel(Cv.name)
    private readonly cvModel: Model<Cv>,
    @InjectModel(Applicant.name)
    private readonly applicantModel: Model<Applicant>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<Position>,
    private readonly textExtractor: CvTextExtractorService,
    private readonly aiService: AiService,
    private readonly cvGenerator: CvGeneratorService,
  ) {}

  async create(file: Express.Multer.File) {
    return this.cvModel.create({
      file: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  findAll() {
    return this.cvModel.find({ deletedAt: null });
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('CV id không hợp lệ');
    }

    const cv = await this.cvModel.findOne({ _id: id, deletedAt: null });

    if (!cv) {
      throw new NotFoundException('Không tìm thấy CV');
    }

    return cv;
  }

  async extract(id: string) {
    const cv = await this.findOne(id);

    cv.status = 'extracting';
    await cv.save();

    try {
      const filePath = join(process.cwd(), 'uploads', 'cvs', cv.file);

      const text = await this.textExtractor.extract(filePath, cv.mimeType);

      const extractedData = await this.aiService.extractCv(text);

      cv.extractedData = extractedData;

      cv.status = 'needs_review';

      await cv.save();

      return extractedData;
    } catch (error) {
      cv.status = 'failed';

      await cv.save();

      throw error;
    }
  }

  async review(
    id: string,
    input: { positionId?: string; jobDescription?: string },
  ) {
    const cv = await this.findOne(id);
    const jobDescription = input.positionId
      ? await this.positionModel.findOne({
          _id: input.positionId,
          deletedAt: null,
        })
      : null;
    const jdText = jobDescription
      ? this.positionToText(jobDescription)
      : input.jobDescription?.trim();

    if (!jdText)
      throw new BadRequestException(
        'Vui lòng chọn Position hoặc nhập Job Description',
      );
    const filePath = join(process.cwd(), 'uploads', 'cvs', cv.file);
    const cvText = await this.textExtractor.extract(filePath, cv.mimeType);
    const review = await this.aiService.reviewCv(cvText, jdText);

    cv.review = review;
    await cv.save();

    await this.applicantModel.updateOne(
      { cv: cv._id },
      { $set: { review: JSON.stringify(review) } },
    );

    return review;
  }

  async updateExtractedData(id: string, input: unknown) {
    const cv = await this.findOne(id);
    let extractedData: ReturnType<typeof ExtractedCvSchema.parse>;
    try {
      extractedData = ExtractedCvSchema.parse(input);
    } catch {
      throw new BadRequestException('Dữ liệu CV không đúng cấu trúc');
    }
    cv.extractedData = extractedData;
    cv.status = 'needs_review';
    await cv.save();
    return extractedData;
  }

  async approve(id: string, positionId?: string) {
    const cv = await this.findOne(id);
    if (!cv.extractedData)
      throw new BadRequestException('CV chưa có dữ liệu trích xuất');

    const extracted = ExtractedCvSchema.parse(cv.extractedData);
    const position = positionId
      ? await this.positionModel.findOne({ _id: positionId, deletedAt: null })
      : extracted.position
        ? await this.positionModel.findOne({
            name: new RegExp(`^${this.escapeRegex(extracted.position)}$`, 'i'),
            deletedAt: null,
          })
        : null;

    if (!position) {
      throw new BadRequestException(
        'Không xác định được Position; hãy gửi positionId',
      );
    }

    const applicant = await this.applicantModel.findOneAndUpdate(
      { cv: cv._id },
      {
        name: extracted.name,
        position: position._id,
        experience_years: extracted.experience_years,
        email: extracted.email,
        phone_number: extracted.phone_number,
        review: cv.review ? JSON.stringify(cv.review) : '',
        cv: cv._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    cv.status = 'approved';
    await cv.save();
    return applicant;
  }

  async generate(id: string) {
    const cv = await this.findOne(id);
    if (cv.status !== 'approved') {
      throw new BadRequestException(
        'Hãy sửa/xác nhận dữ liệu và gọi /approve trước khi generate',
      );
    }
    cv.status = 'generating';
    await cv.save();

    try {
      cv.generatedFiles = await this.cvGenerator.generate(cv, id);
      cv.status = 'generated';
      await cv.save();
      return cv.generatedFiles;
    } catch (error) {
      cv.status = 'failed';
      await cv.save();
      throw error;
    }
  }

  async generatedFile(id: string, format: 'docx' | 'pdf') {
    const cv = await this.findOne(id);
    const path = this.cvGenerator.generatedPath(id, format);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('Chưa có file được generate');
    }
    return { path, originalName: cv.originalName };
  }

  private positionToText(position: Position) {
    return [
      `Position: ${position.name}`,
      `Description: ${position.description}`,
      `Required skills: ${position.requiredSkills.join(', ')}`,
      `Preferred skills: ${position.preferredSkills.join(', ')}`,
      `Minimum experience years: ${position.minExperienceYears}`,
      `Education: ${position.educationRequirements ?? ''}`,
    ].join('\n');
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
