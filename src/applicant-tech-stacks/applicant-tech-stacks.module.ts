import { Module } from '@nestjs/common';
import { ApplicantTechStacksService } from './applicant-tech-stacks.service.js';
import { ApplicantTechStacksController } from './applicant-tech-stacks.controller.js';
import {
  ApplicantTechStack,
  ApplicantTechStackSchema,
} from './entities/applicant-tech-stack.entity.js';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Applicant,
  ApplicantSchema,
} from '../applicants/entities/applicant.entity.js';
import {
  TechStack,
  TechStackSchema,
} from '../tech-stacks/entities/tech-stack.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApplicantTechStack.name, schema: ApplicantTechStackSchema },
      { name: Applicant.name, schema: ApplicantSchema },
      { name: TechStack.name, schema: TechStackSchema },
    ]),
  ],
  controllers: [ApplicantTechStacksController],
  providers: [ApplicantTechStacksService],
})
export class ApplicantTechStacksModule {}
