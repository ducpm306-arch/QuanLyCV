import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePositionDto } from './dto/create-position.dto.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { Position } from './entities/position.entity.js';
import { isValidObjectId, Model } from 'mongoose';

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Position.name) private readonly positionModel: Model<Position>,
  ) {}

  async create(createPositionDto: CreatePositionDto) {
    return this.positionModel.create({
      name: createPositionDto.name.trim(),
      description: createPositionDto.description.trim(),
      requiredSkills: createPositionDto.requiredSkills ?? [],
      preferredSkills: createPositionDto.preferredSkills ?? [],
      minExperienceYears: createPositionDto.minExperienceYears ?? 0,
      educationRequirements: createPositionDto.educationRequirements?.trim(),
    });
  }

  findAll() {
    return this.positionModel.find({ deletedAt: null }).exec();
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Position id không hợp lệ');
    }
    const position = await this.positionModel.findOne({
      _id: id,
      deletedAt: null,
    });
    if (!position) throw new NotFoundException('Không tìm thấy position');
    return position;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto) {
    const position = await this.findOne(id);
    Object.assign(position, updatePositionDto);
    return position.save();
  }

  async remove(id: string) {
    const position = await this.findOne(id);
    position.deletedAt = new Date();
    await position.save();
    return { message: 'Đã xóa position' };
  }
}
