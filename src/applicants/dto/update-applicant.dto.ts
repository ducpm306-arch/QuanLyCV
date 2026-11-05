import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicantDto } from './create-applicant.dto.js';

export class UpdateApplicantDto extends PartialType(CreateApplicantDto) {}
