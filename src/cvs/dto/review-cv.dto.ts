import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ReviewCvDto {
  @IsOptional()
  @IsMongoId()
  positionId?: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
