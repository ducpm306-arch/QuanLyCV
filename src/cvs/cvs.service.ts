import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cv } from './entities/cv.entity.js';
import { isValidObjectId, Model, Types } from 'mongoose';
import { join } from 'node:path';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import { AiService } from '../ai/ai.service.js';
import { Applicant } from '../applicants/entities/applicant.entity.js';
import { CvGeneratorService } from './cv-generator.service.js';
import { access } from 'node:fs/promises';
import { Position } from '../positions/entities/position.entity.js';
import {
  ExtractedCvSchema,
  type CvReview,
} from '../ai/schemas/extracted-cv.schema.js';
import { TechStack } from '../tech-stacks/entities/tech-stack.entity.js';
import { ApplicantTechStack } from '../applicant-tech-stacks/entities/applicant-tech-stack.entity.js';

@Injectable()
export class CvsService {
  constructor(
    @InjectModel(Cv.name)
    private readonly cvModel: Model<Cv>,
    @InjectModel(Applicant.name)
    private readonly applicantModel: Model<Applicant>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<Position>,
    @InjectModel(TechStack.name)
    private readonly techStackModel: Model<TechStack>,
    @InjectModel(ApplicantTechStack.name)
    private readonly applicantTechStackModel: Model<ApplicantTechStack>,
    private readonly textExtractor: CvTextExtractorService,
    private readonly aiService: AiService,
    private readonly cvGenerator: CvGeneratorService,
  ) {}

  async create(file: Express.Multer.File) {
    return this.cvModel.create({
      file: file.filename,
      originalName: this.decodeUploadFileName(file.originalname),
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
      const matchedPosition = await this.findClosestPosition(
        extractedData.position,
      );
      const databaseTechStacks = await this.techStackModel
        .find({
          deletedAt: null,
          ...(matchedPosition ? { position: matchedPosition._id } : {}),
        })
        .select('name')
        .lean()
        .exec();
      const detectedTechStacks = new Set(
        extractedData.tech_stacks.map((name) => this.normalizeTechStack(name)),
      );
      extractedData.tech_stacks = databaseTechStacks
        .filter((techStack) =>
          detectedTechStacks.has(this.normalizeTechStack(techStack.name)),
        )
        .map((techStack) => techStack.name);

      cv.extractedData = extractedData;

      cv.status = 'needs_review';

      await cv.save();

      return {
        ...extractedData,
        positionId: matchedPosition?._id.toString() ?? '',
        matchedPositionName: matchedPosition?.name ?? '',
      };
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
    let jdText = input.jobDescription?.trim();
    let allowedTechStacks: string[] = [];

    if (input.positionId) {
      const position = await this.positionModel.findOne({
        _id: input.positionId,
        deletedAt: null,
      });
      if (!position) {
        throw new NotFoundException('Không tìm thấy vị trí tuyển dụng');
      }

      allowedTechStacks = await this.positionTechStacks(position._id);
      const positionText = this.positionToText(position, allowedTechStacks);
      if (!this.positionHasJobRequirements(position, allowedTechStacks)) {
        if (!input.jobDescription?.trim()) {
          throw new BadRequestException(
            'Vị trí này chưa có JD hoặc yêu cầu kỹ năng. Hãy cấu hình Position hoặc nhập JD bổ sung.',
          );
        }
        jdText = `${positionText}\nAdditional job description: ${input.jobDescription.trim()}`;
      } else {
        jdText = input.jobDescription?.trim()
          ? `${positionText}\nAdditional job description: ${input.jobDescription.trim()}`
          : positionText;
      }
    }

    if (!jdText)
      throw new BadRequestException(
        'Vui lòng chọn Position hoặc nhập Job Description',
      );
    const filePath = join(process.cwd(), 'uploads', 'cvs', cv.file);
    const cvText = await this.textExtractor.extract(filePath, cv.mimeType);
    const review = await this.aiService.reviewCv(
      cvText,
      jdText,
      allowedTechStacks,
    );

    cv.review = review;
    if (cv.extractedData) {
      cv.extractedData = {
        ...cv.extractedData,
        review: this.formatReview(review),
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

    const positionTechStacks = await this.techStackModel
      .find({ position: position._id, deletedAt: null })
      .select('_id name')
      .exec();
    const cvStackNames = new Set(
      extracted.tech_stacks.map((name) => this.normalizeTechStack(name)),
    );
    const matchedTechStacks = positionTechStacks.filter((techStack) =>
      cvStackNames.has(this.normalizeTechStack(techStack.name)),
    );
    extracted.tech_stacks = matchedTechStacks.map(
      (techStack) => techStack.name,
    );

    const applicant = await this.applicantModel.findOneAndUpdate(
      { cv: cv._id },
      {
        name: extracted.name,
        position: position._id,
        experience_years: extracted.experience_years,
        email: extracted.email,
        phone_number: extracted.phone_number,
        review:
          extracted.review || (cv.review ? JSON.stringify(cv.review) : ''),
        cv: cv._id,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    if (!applicant) {
      throw new NotFoundException('Không thể lưu ứng viên');
    }

    await this.syncApplicantTechStacks(
      applicant._id,
      matchedTechStacks.map((techStack) => techStack._id),
    );

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

  private async positionTechStacks(positionId: Types.ObjectId) {
    const techStacks = await this.techStackModel
      .find({ position: positionId, deletedAt: null })
      .select('name')
      .lean()
      .exec();
    return techStacks.map((techStack) => techStack.name);
  }

  private positionToText(position: Position, techStacks: string[]) {
    return [
      `Position: ${position.name}`,
      `Description: ${position.description}`,
      `Required skills: ${position.requiredSkills.join(', ')}`,
      `Preferred skills: ${position.preferredSkills.join(', ')}`,
      `Tech stacks: ${techStacks.join(', ')}`,
      `Minimum experience years: ${position.minExperienceYears}`,
      `Education: ${position.educationRequirements ?? ''}`,
    ].join('\n');
  }

  private formatReview(review: CvReview) {
    const criteriaLabels: Record<string, string> = {
      skills: 'Kỹ năng',
      experience: 'Kinh nghiệm',
      education: 'Trình độ',
      jobRequirements: 'Yêu cầu công việc',
    };
    const reasons = review.criteria
      .map((criterion) => {
        const label = criteriaLabels[criterion.name] ?? criterion.name;
        const evidence = criterion.evidence.length
          ? ` Dẫn chứng: ${criterion.evidence.join('; ')}.`
          : '';
        return `${label}: ${criterion.explanation}${evidence}`;
      })
      .join('\n');

    return [
      `Điểm số: ${review.overallScore}/100`,
      `Nhận xét: ${review.summary}`,
      `Điểm mạnh: ${review.strengths.join('; ') || 'Chưa xác định'}`,
      `Điểm yếu: ${review.weaknesses.join('; ') || 'Chưa xác định'}`,
      `Lý do đánh giá:\n${reasons}`,
    ].join('\n\n');
  }

  private positionHasJobRequirements(position: Position, techStacks: string[]) {
    return Boolean(
      position.description?.trim() ||
      position.requiredSkills.length ||
      position.preferredSkills.length ||
      techStacks.length ||
      position.minExperienceYears > 0 ||
      position.educationRequirements?.trim(),
    );
  }

  private async syncApplicantTechStacks(
    applicantId: Types.ObjectId,
    techStackIds: Types.ObjectId[],
  ) {
    await this.applicantTechStackModel.updateMany(
      { applicant: applicantId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );

    await Promise.all(
      techStackIds.map((techStackId) =>
        this.applicantTechStackModel.updateOne(
          { applicant: applicantId, tech_stack: techStackId },
          {
            $set: { deletedAt: null },
            $setOnInsert: {
              applicant: applicantId,
              tech_stack: techStackId,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  private normalizeTechStack(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  private async findClosestPosition(positionName: string | null) {
    if (!positionName?.trim()) return null;

    const positions = await this.positionModel
      .find({ deletedAt: null })
      .select('_id name')
      .lean()
      .exec();
    const queryTerms = this.positionTerms(positionName);
    if (queryTerms.size === 0) return null;

    let bestPosition: (typeof positions)[number] | null = null;
    let bestScore = 0;
    let ambiguous = false;
    for (const position of positions) {
      const candidateTerms = this.positionTerms(position.name);
      const overlap = [...queryTerms].filter((term) =>
        candidateTerms.has(term),
      );
      const score = overlap.length / queryTerms.size;
      if (score > bestScore) {
        bestPosition = position;
        bestScore = score;
        ambiguous = false;
      } else if (score > 0 && score === bestScore) {
        ambiguous = true;
      }
    }

    return bestScore >= 0.5 && !ambiguous ? bestPosition : null;
  }

  private positionTerms(value: string) {
    const ignoredTerms = new Set([
      'thuc',
      'tap',
      'sinh',
      'intern',
      'internship',
      'junior',
      'senior',
      'fresher',
      'developer',
      'engineer',
      'ky',
      'su',
      'lap',
      'trinh',
      'vien',
    ]);
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\bback[\s-]?end\b/g, 'backend')
      .replace(/\bfront[\s-]?end\b/g, 'frontend')
      .replace(/\bfull[\s-]?stack\b/g, 'fullstack')
      .replace(/[^a-z0-9+#.]+/g, ' ');
    return new Set(
      normalized.split(/\s+/).filter((term) => term && !ignoredTerms.has(term)),
    );
  }

  private decodeUploadFileName(value: string) {
    if (!/[ÃÄÅÆÐ]|á[º»]/.test(value)) return value;

    const bytes = Uint8Array.from(value, (character) =>
      character.charCodeAt(0),
    );
    const decoded = new TextDecoder().decode(bytes);
    return decoded.includes('\uFFFD') ? value : decoded;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
