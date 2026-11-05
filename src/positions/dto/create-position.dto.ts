import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  minExperienceYears?: number;

  @IsOptional()
  @IsString()
  educationRequirements?: string;
}
