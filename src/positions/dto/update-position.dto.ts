import { PartialType } from '@nestjs/mapped-types';
import { CreatePositionDto } from './create-position.dto.js';

export class UpdatePositionDto extends PartialType(CreatePositionDto) {}
