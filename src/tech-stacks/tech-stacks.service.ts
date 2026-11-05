import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { TechStack } from './entities/tech-stack.entity.js';
import { Position } from '../positions/entities/position.entity.js';
import { CreateTechStackDto } from './dto/create-tech-stack.dto.js';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto.js';

@Injectable()
export class TechStacksService {
  constructor(
    @InjectModel(TechStack.name)
    private readonly techStackModel: Model<TechStack>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<Position>,
  ) {}

  async create(input: CreateTechStackDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Tên kỹ năng không được để trống');
    await this.assertPosition(input.position);
    return this.techStackModel.create({
      name,
      position: new Types.ObjectId(input.position),
    });
  }

  findAll() {
    return this.techStackModel
      .find({ deletedAt: null })
      .populate('position')
      .exec();
  }

  async findOne(id: string) {
    const techStack = await this.findDocument(id);
    await techStack.populate('position');
    return techStack;
  }

  private findDocument(id: string) {
    return this.techStackModel
      .findOne({ _id: this.objectId(id), deletedAt: null })
      .orFail(new NotFoundException('Không tìm thấy kỹ năng'))
      .exec();
  }

  async update(id: string, input: UpdateTechStackDto) {
    const techStack = await this.findDocument(id);
    if (input.position) {
      await this.assertPosition(input.position);
      techStack.position = new Types.ObjectId(input.position);
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name)
        throw new BadRequestException('Tên kỹ năng không được để trống');
      techStack.name = name;
    }
    return techStack.save();
  }

  async remove(id: string) {
    const techStack = await this.findDocument(id);
    techStack.deletedAt = new Date();
    await techStack.save();
    return { message: 'Đã xóa kỹ năng' };
  }

  private objectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Tech stack id không hợp lệ');
    }
    return id;
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
}
