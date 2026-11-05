import {
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateApplicantDto {
  @IsString()
  name: string;

  @IsMongoId()
  position: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experience_years?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  review?: string;

  @IsMongoId()
  cv: string;
}
