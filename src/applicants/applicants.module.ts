import { Module } from '@nestjs/common';
import { ApplicantsService } from './applicants.service.js';
import { ApplicantsController } from './applicants.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Applicant, ApplicantSchema } from './entities/applicant.entity.js';
import { Cv, CvSchema } from '../cvs/entities/cv.entity.js';
import {
  Position,
  PositionSchema,
} from '../positions/entities/position.entity.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Applicant.name, schema: ApplicantSchema },
      { name: Cv.name, schema: CvSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [ApplicantsController],
  providers: [ApplicantsService],
})
export class ApplicantsModule {}
