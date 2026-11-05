import { z } from 'zod';

export const ExtractedCvSchema = z.object({
  name: z.string().nullable(),
  position: z.string().nullable(),
  experience_years: z
    .number()
    .min(0)
    .nullable()
    .transform((value) => value ?? 0),
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
  tech_stacks: z.array(z.string()),
  review: z.string().nullable(),
});

export const OcrTextSchema = z.object({ text: z.string() });

export type ExtractedCv = z.infer<typeof ExtractedCvSchema>;

const reviewCriterionNames = [
  'skills',
  'experience',
  'education',
  'jobRequirements',
] as const;

export const CvReviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  criteria: z
    .array(
      z.object({
        name: z.enum(reviewCriterionNames),
        score: z.number().min(0).max(100),
        explanation: z.string(),
        evidence: z.array(z.string()),
      }),
    )
    .length(reviewCriterionNames.length)
    .refine(
      (criteria) =>
        new Set(criteria.map((criterion) => criterion.name)).size ===
        reviewCriterionNames.length,
      'Mỗi tiêu chí đánh giá phải xuất hiện đúng một lần',
    ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  summary: z.string(),
  missingInformation: z.array(z.string()),
});

export type CvReview = z.infer<typeof CvReviewSchema>;
