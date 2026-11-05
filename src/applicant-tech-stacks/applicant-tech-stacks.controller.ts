import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApplicantTechStacksService } from './applicant-tech-stacks.service.js';
import { CreateApplicantTechStackDto } from './dto/create-applicant-tech-stack.dto.js';
import { UpdateApplicantTechStackDto } from './dto/update-applicant-tech-stack.dto.js';

@Controller('applicant-tech-stacks')
export class ApplicantTechStacksController {
  constructor(
    private readonly applicantTechStacksService: ApplicantTechStacksService,
  ) {}

  @Post()
  create(@Body() createApplicantTechStackDto: CreateApplicantTechStackDto) {
    return this.applicantTechStacksService.create(createApplicantTechStackDto);
  }

  @Get()
  findAll() {
    return this.applicantTechStacksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicantTechStacksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateApplicantTechStackDto: UpdateApplicantTechStackDto,
  ) {
    return this.applicantTechStacksService.update(
      id,
      updateApplicantTechStackDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicantTechStacksService.remove(id);
  }
}
