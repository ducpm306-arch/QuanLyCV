import { describe, expect, it } from 'vitest';
import { CvReviewSchema, ExtractedCvSchema } from './extracted-cv.schema.js';

const criteria = [
  {
    name: 'skills',
    score: 80,
    explanation: 'Phù hợp',
    evidence: ['TypeScript'],
  },
  {
    name: 'experience',
    score: 70,
    explanation: 'Đủ kinh nghiệm',
    evidence: [],
  },
  {
    name: 'education',
    score: 60,
    explanation: 'Có thông tin',
    evidence: [],
  },
  {
    name: 'jobRequirements',
    score: 90,
    explanation: 'Đáp ứng tốt',
    evidence: [],
  },
] as const;

describe('CV schemas', () => {
  it('uses zero when experience years is null', () => {
    const result = ExtractedCvSchema.parse({
      name: 'Nguyen Van A',
      position: 'Backend Developer',
      experience_years: null,
      email: null,
      phone_number: null,
      tech_stacks: [],
      review: null,
    });

    expect(result.experience_years).toBe(0);
  });

  it('accepts a review when the overall score matches the average', () => {
    const result = CvReviewSchema.safeParse({
      overallScore: 75,
      criteria,
      strengths: [],
      weaknesses: [],
      summary: 'Phù hợp',
      missingInformation: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a review with an incorrect overall score', () => {
    const result = CvReviewSchema.safeParse({
      overallScore: 90,
      criteria,
      strengths: [],
      weaknesses: [],
      summary: 'Phù hợp',
      missingInformation: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate review criteria', () => {
    const result = CvReviewSchema.safeParse({
      overallScore: 75,
      criteria: [criteria[0], criteria[0], criteria[2], criteria[3]],
      strengths: [],
      weaknesses: [],
      summary: 'Phù hợp',
      missingInformation: [],
    });

    expect(result.success).toBe(false);
  });
});
