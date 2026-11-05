import { IsMongoId, IsOptional } from 'class-validator';

export class ApproveCvDto {
  @IsOptional()
  @IsMongoId()
  positionId?: string;
}
