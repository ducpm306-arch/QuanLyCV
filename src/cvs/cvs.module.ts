import { Module } from '@nestjs/common';
import { CvsService } from './cvs.service.js';
import { CvsController } from './cvs.controller.js';
import { Cv, CvSchema } from './entities/cv.entity.js';
import { MongooseModule } from '@nestjs/mongoose';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import { AiModule } from '../ai/ai.module.js';
import {
  Applicant,
  ApplicantSchema,
} from '../applicants/entities/applicant.entity.js';
import { CvGeneratorService } from './cv-generator.service.js';
import {
  Position,
  PositionSchema,
} from '../positions/entities/position.entity.js';
import {
  TechStack,
  TechStackSchema,
} from '../tech-stacks/entities/tech-stack.entity.js';
import {
  ApplicantTechStack,
  ApplicantTechStackSchema,
} from '../applicant-tech-stacks/entities/applicant-tech-stack.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cv.name, schema: CvSchema },
      { name: Applicant.name, schema: ApplicantSchema },
      { name: Position.name, schema: PositionSchema },
      { name: TechStack.name, schema: TechStackSchema },
      { name: ApplicantTechStack.name, schema: ApplicantTechStackSchema },
    ]),
    AiModule,
  ],
  controllers: [CvsController],
  providers: [CvsService, CvTextExtractorService, CvGeneratorService],
})
export class CvsModule {}
