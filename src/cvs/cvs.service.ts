import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { isEmail } from 'class-validator';
import { AiService } from '../ai/ai.service.js';
import { ExtractedCvSchema } from '../ai/schemas/extracted-cv.schema.js';
import { Applicant } from '../applicants/entities/applicant.entity.js';
import { CvGeneratorService } from './cv-generator.service.js';
import {
  decodeUploadFileName,
  formatCvReview,
  positionHasJobRequirements,
  positionToText,
} from './cv-helpers.js';
import { CvPositionService } from './cv-position.service.js';
import { CvTechStackService } from './cv-tech-stack.service.js';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import { ReviewCvDto } from './dto/review-cv.dto.js';
import { Cv } from './entities/cv.entity.js';

@Injectable()
export class CvsService {
  constructor(
    @InjectModel(Cv.name)
    private readonly cvModel: Model<Cv>,
    @InjectModel(Applicant.name)
    private readonly applicantModel: Model<Applicant>,
    private readonly textExtractor: CvTextExtractorService,
    private readonly aiService: AiService,
    private readonly cvGenerator: CvGeneratorService,
    private readonly cvPositionService: CvPositionService,
    private readonly cvTechStackService: CvTechStackService,
  ) {}

  async create(file: Express.Multer.File) {
    return this.cvModel.create({
      file: file.filename,
      originalName: decodeUploadFileName(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  findAll() {
    return this.cvModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
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

      const matchedPosition = await this.cvPositionService.findClosest(
        extractedData.position,
      );
      extractedData.tech_stacks = await this.cvTechStackService.matchNames(
        extractedData.tech_stacks,
        matchedPosition?._id,
      );

      cv.extractedData = extractedData;
      cv.status = 'needs_review';
      await cv.save();

      let positionId = '';
      let matchedPositionName = '';
      if (matchedPosition) {
        positionId = matchedPosition._id.toString();
        matchedPositionName = matchedPosition.name;
      }

      return {
        ...extractedData,
        positionId,
        matchedPositionName,
      };
    } catch (error) {
      cv.status = 'failed';
      await cv.save();
      throw error;
    }
  }

  async review(id: string, input: ReviewCvDto) {
    const cv = await this.findOne(id);
    let jobDescription = input.jobDescription?.trim() || '';
    let allowedTechStacks: string[] = [];

    if (input.positionId) {
      const position = await this.cvPositionService.findById(input.positionId);
      if (!position) {
        throw new NotFoundException('Không tìm thấy vị trí tuyển dụng');
      }

      allowedTechStacks = await this.cvTechStackService.getNamesForPosition(
        position._id,
      );
      const positionText = positionToText(position, allowedTechStacks);
      const extraJobDescription = input.jobDescription?.trim() || '';

      if (!positionHasJobRequirements(position, allowedTechStacks)) {
        if (!extraJobDescription) {
          throw new BadRequestException(
            'Vị trí này chưa có JD hoặc yêu cầu kỹ năng. Hãy cấu hình Position hoặc nhập JD bổ sung.',
          );
        }
        jobDescription = `${positionText}\nAdditional job description: ${extraJobDescription}`;
      } else {
        jobDescription = positionText;
        if (extraJobDescription) {
          jobDescription = `${positionText}\nAdditional job description: ${extraJobDescription}`;
        }
      }
    }

    if (!jobDescription) {
      throw new BadRequestException(
        'Vui lòng chọn Position hoặc nhập Job Description',
      );
    }

    const filePath = join(process.cwd(), 'uploads', 'cvs', cv.file);
    const cvText = await this.textExtractor.extract(filePath, cv.mimeType);
    const review = await this.aiService.reviewCv(
      cvText,
      jobDescription,
      allowedTechStacks,
    );

    cv.review = review;
    if (cv.extractedData) {
      cv.extractedData = {
        ...cv.extractedData,
        review: formatCvReview(review),
      };
    }
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
    if (!cv.extractedData) {
      throw new BadRequestException('CV chưa có dữ liệu trích xuất');
    }

    const extracted = ExtractedCvSchema.parse(cv.extractedData);
    const name = extracted.name?.trim();
    const email = extracted.email?.trim();
    if (!name) {
      throw new BadRequestException('Vui lòng nhập họ và tên ứng viên');
    }
    if (!email || !isEmail(email)) {
      throw new BadRequestException('Vui lòng nhập email hợp lệ');
    }
    extracted.name = name;
    extracted.email = email.toLowerCase();

    const position = await this.cvPositionService.findForApproval(
      positionId,
      extracted.position,
    );
    if (!position) {
      throw new BadRequestException(
        'Không xác định được Position; hãy gửi positionId',
      );
    }

    const matchedTechStacks =
      await this.cvTechStackService.findMatchesForPosition(
        extracted.tech_stacks,
        position._id,
      );

    extracted.tech_stacks = [];
    const techStackIds: Types.ObjectId[] = [];
    for (const techStack of matchedTechStacks) {
      extracted.tech_stacks.push(techStack.name);
      techStackIds.push(techStack._id);
    }

    let review = '';
    if (extracted.review) {
      review = extracted.review;
    } else if (cv.review) {
      review = JSON.stringify(cv.review);
    }

    const applicant = await this.applicantModel.findOneAndUpdate(
      { cv: cv._id },
      {
        name: extracted.name,
        position: position._id,
        experience_years: extracted.experience_years,
        email: extracted.email,
        phone_number: extracted.phone_number,
        review,
        cv: cv._id,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    if (!applicant) {
      throw new NotFoundException('Không thể lưu ứng viên');
    }

    await this.cvTechStackService.syncApplicant(applicant._id, techStackIds);

    cv.extractedData = extracted;
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
}
