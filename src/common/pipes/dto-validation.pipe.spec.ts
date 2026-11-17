import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ReviewCvDto } from '../../cvs/dto/review-cv.dto.js';
import { DtoValidationPipe } from './dto-validation.pipe.js';

const metadata = {
  type: 'body' as const,
  metatype: ReviewCvDto,
  data: undefined,
};

describe('DtoValidationPipe', () => {
  it('accepts a valid DTO', async () => {
    const pipe = new DtoValidationPipe();
    const result = await pipe.transform(
      {
        positionId: '507f1f77bcf86cd799439011',
        jobDescription: 'Backend Developer',
      },
      metadata,
    );

    expect(result).toBeInstanceOf(ReviewCvDto);
    expect((result as ReviewCvDto).jobDescription).toBe('Backend Developer');
  });

  it('rejects an invalid position id', async () => {
    const pipe = new DtoValidationPipe();
    await expect(
      pipe.transform({ positionId: 'invalid' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects fields that are not in the DTO', async () => {
    const pipe = new DtoValidationPipe();
    await expect(
      pipe.transform({ unexpected: true }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-object request body', async () => {
    const pipe = new DtoValidationPipe();
    await expect(pipe.transform('invalid', metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
