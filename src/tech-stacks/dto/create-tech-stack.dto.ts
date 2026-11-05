import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTechStackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsMongoId()
  position: string;
}
