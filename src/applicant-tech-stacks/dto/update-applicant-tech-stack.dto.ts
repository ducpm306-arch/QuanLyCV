import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicantTechStackDto } from './create-applicant-tech-stack.dto.js';

export class UpdateApplicantTechStackDto extends PartialType(
  CreateApplicantTechStackDto,
) {}
