import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Applicant } from './entities/applicant.entity.js';
import { CreateApplicantDto } from './dto/create-applicant.dto.js';
import { UpdateApplicantDto } from './dto/update-applicant.dto.js';
import { Cv } from '../cvs/entities/cv.entity.js';
import { Position } from '../positions/entities/position.entity.js';

@Injectable()
export class ApplicantsService {
  constructor(
    @InjectModel(Applicant.name)
    private readonly applicantModel: Model<Applicant>,
    @InjectModel(Cv.name)
    private readonly cvModel: Model<Cv>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<Position>,
  ) {}

  async create(input: CreateApplicantDto) {
    await this.assertReferences(input.position, input.cv);
    return this.applicantModel.create(input);
  }

  findAll() {
    return this.applicantModel
      .find({ deletedAt: null })
      .populate('position')
      .populate('cv')
      .exec();
  }

  async findOne(id: string) {
    const applicant = await this.findDocument(id);
    await applicant.populate(['position', 'cv']);
    return applicant;
  }

  private findDocument(id: string) {
    return this.applicantModel
      .findOne({ _id: this.objectId(id), deletedAt: null })
      .orFail(new NotFoundException('Không tìm thấy ứng viên'))
      .exec();
  }

  async update(id: string, input: UpdateApplicantDto) {
    const applicant = await this.findDocument(id);
    if (input.position) {
      await this.assertPosition(input.position);
      applicant.position = new Types.ObjectId(input.position);
    }
    if (input.cv) {
      await this.assertCv(input.cv);
      applicant.cv = new Types.ObjectId(input.cv);
    }
    if (input.name !== undefined) applicant.name = input.name;
    if (input.experience_years !== undefined)
      applicant.experience_years = input.experience_years;
    if (input.email !== undefined) applicant.email = input.email;
    if (input.phone_number !== undefined)
      applicant.phone_number = input.phone_number;
    if (input.review !== undefined) applicant.review = input.review;
    return applicant.save();
  }

  async remove(id: string) {
    const applicant = await this.findDocument(id);
    applicant.deletedAt = new Date();
    await applicant.save();
    return { message: 'Đã xóa ứng viên' };
  }

  private objectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Applicant id không hợp lệ');
    }
    return new Types.ObjectId(id);
  }

  private async assertReferences(positionId: string, cvId: string) {
    await Promise.all([this.assertPosition(positionId), this.assertCv(cvId)]);
  }

  private async assertPosition(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Position id không hợp lệ');
    }
    const position = await this.positionModel.exists({
      _id: id,
      deletedAt: null,
    });
    if (!position)
      throw new NotFoundException('Không tìm thấy vị trí tuyển dụng');
  }

  private async assertCv(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('CV id không hợp lệ');
    }
    const cv = await this.cvModel.exists({ _id: id, deletedAt: null });
    if (!cv) throw new NotFoundException('Không tìm thấy CV');
  }
}
