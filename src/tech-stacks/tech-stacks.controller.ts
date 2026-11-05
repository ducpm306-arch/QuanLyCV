import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TechStacksService } from './tech-stacks.service.js';
import { CreateTechStackDto } from './dto/create-tech-stack.dto.js';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto.js';

@Controller('tech-stacks')
export class TechStacksController {
  constructor(private readonly techStacksService: TechStacksService) {}

  @Post()
  create(@Body() createTechStackDto: CreateTechStackDto) {
    return this.techStacksService.create(createTechStackDto);
  }

  @Get()
  findAll() {
    return this.techStacksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.techStacksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTechStackDto: UpdateTechStackDto,
  ) {
    return this.techStacksService.update(id, updateTechStackDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.techStacksService.remove(id);
  }
}
