import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { CvsService } from './cvs.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { cvUploadOptions } from './cv-upload.config.js';
import { ReviewCvDto } from './dto/review-cv.dto.js';
import { ApproveCvDto } from './dto/approve-cv.dto.js';

@Controller('cvs')
export class CvsController {
  constructor(private readonly cvsService: CvsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', cvUploadOptions))
  create(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file CV');
    }

    return this.cvsService.create(file);
  }

  @Get()
  findAll() {
    return this.cvsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cvsService.findOne(id);
  }

  @Post(':id/extract')
  extract(@Param('id') id: string) {
    return this.cvsService.extract(id);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: ReviewCvDto) {
    return this.cvsService.review(id, body);
  }

  @Patch(':id/extracted-data')
  updateExtractedData(@Param('id') id: string, @Body() body: unknown) {
    return this.cvsService.updateExtractedData(id, body);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: ApproveCvDto = {}) {
    return this.cvsService.approve(id, body.positionId);
  }

  @Post(':id/generate')
  generate(@Param('id') id: string) {
    return this.cvsService.generate(id);
  }

  @Get(':id/preview')
  async preview(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.cvsService.generatedFile(id, 'pdf');
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="cv.pdf"',
    });
    return new StreamableFile(createReadStream(file.path));
  }

  @Get(':id/download/:format')
  async download(
    @Param('id') id: string,
    @Param('format') format: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (format !== 'pdf' && format !== 'docx') {
      throw new BadRequestException('Định dạng chỉ có thể là pdf hoặc docx');
    }

    const file = await this.cvsService.generatedFile(id, format);
    response.set({
      'Content-Type':
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="cv.${format}"`,
    });
    return new StreamableFile(createReadStream(file.path));
  }
}
