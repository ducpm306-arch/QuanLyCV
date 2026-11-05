import { IsMongoId } from 'class-validator';

export class CreateApplicantTechStackDto {
  @IsMongoId()
  applicant: string;

  @IsMongoId()
  tech_stack: string;
}
