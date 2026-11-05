import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { ApplicantTechStack } from './entities/applicant-tech-stack.entity.js';
import { Applicant } from '../applicants/entities/applicant.entity.js';
import { TechStack } from '../tech-stacks/entities/tech-stack.entity.js';
import { CreateApplicantTechStackDto } from './dto/create-applicant-tech-stack.dto.js';
import { UpdateApplicantTechStackDto } from './dto/update-applicant-tech-stack.dto.js';

@Injectable()
export class ApplicantTechStacksService {
  constructor(
    @InjectModel(ApplicantTechStack.name)
    private readonly applicantTechStackModel: Model<ApplicantTechStack>,
    @InjectModel(Applicant.name)
    private readonly applicantModel: Model<Applicant>,
    @InjectModel(TechStack.name)
    private readonly techStackModel: Model<TechStack>,
  ) {}

  async create(input: CreateApplicantTechStackDto) {
    await Promise.all([
      this.assertApplicant(input.applicant),
      this.assertTechStack(input.tech_stack),
    ]);
    return this.applicantTechStackModel.create({
      applicant: new Types.ObjectId(input.applicant),
      tech_stack: new Types.ObjectId(input.tech_stack),
    });
  }

  findAll() {
    return this.applicantTechStackModel
      .find({ deletedAt: null })
      .populate('applicant')
      .populate('tech_stack')
      .exec();
  }

  async findOne(id: string) {
    const link = await this.findDocument(id);
    await link.populate(['applicant', 'tech_stack']);
    return link;
  }

  private findDocument(id: string) {
    return this.applicantTechStackModel
      .findOne({ _id: this.objectId(id), deletedAt: null })
      .orFail(new NotFoundException('Không tìm thấy kỹ năng của ứng viên'))
      .exec();
  }

  async update(id: string, input: UpdateApplicantTechStackDto) {
    const link = await this.findDocument(id);
    if (input.applicant) {
      await this.assertApplicant(input.applicant);
      link.applicant = new Types.ObjectId(input.applicant);
    }
    if (input.tech_stack) {
      await this.assertTechStack(input.tech_stack);
      link.tech_stack = new Types.ObjectId(input.tech_stack);
    }
    return link.save();
  }

  async remove(id: string) {
    const link = await this.findDocument(id);
    link.deletedAt = new Date();
    await link.save();
    return { message: 'Đã xóa kỹ năng của ứng viên' };
  }

  private objectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Applicant tech stack id không hợp lệ');
    }
    return id;
  }

  private async assertApplicant(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Applicant id không hợp lệ');
    }
    const applicant = await this.applicantModel.exists({
      _id: id,
      deletedAt: null,
    });
    if (!applicant) throw new NotFoundException('Không tìm thấy ứng viên');
  }

  private async assertTechStack(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Tech stack id không hợp lệ');
    }
    const techStack = await this.techStackModel.exists({
      _id: id,
      deletedAt: null,
    });
    if (!techStack) throw new NotFoundException('Không tìm thấy kỹ năng');
  }
}
