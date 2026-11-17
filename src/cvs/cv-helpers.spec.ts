import { describe, expect, it } from 'vitest';
import { Position } from '../positions/entities/position.entity.js';
import {
  decodeUploadFileName,
  escapeRegex,
  formatCvReview,
  normalizeTechStack,
  positionHasJobRequirements,
  positionTerms,
  positionToText,
} from './cv-helpers.js';

function makePosition(values: Partial<Position> = {}) {
  return Object.assign(new Position(), {
    name: 'Backend Developer',
    description: '',
    requiredSkills: [],
    preferredSkills: [],
    minExperienceYears: 0,
    educationRequirements: null,
    ...values,
  });
}

describe('CV helpers', () => {
  it('normalizes tech stack names before comparing them', () => {
    expect(normalizeTechStack('Node JS')).toBe('nodejs');
    expect(normalizeTechStack('  React  ')).toBe('react');
  });

  it('keeps meaningful position words and removes seniority words', () => {
    expect([...positionTerms('Senior Back-end Developer')]).toEqual([
      'backend',
    ]);
    expect([...positionTerms('Thực tập sinh Front End')]).toEqual(['frontend']);
  });

  it('detects whether a position has information for a review', () => {
    expect(positionHasJobRequirements(makePosition(), [])).toBe(false);
    expect(
      positionHasJobRequirements(
        makePosition({ requiredSkills: ['REST API'] }),
        [],
      ),
    ).toBe(true);
    expect(positionHasJobRequirements(makePosition(), ['NestJS'])).toBe(true);
  });

  it('builds the job description sent to the AI service', () => {
    const position = makePosition({
      description: 'Xây dựng API',
      requiredSkills: ['TypeScript'],
      minExperienceYears: 1,
    });

    const text = positionToText(position, ['NestJS']);
    expect(text).toContain('Position: Backend Developer');
    expect(text).toContain('Required skills: TypeScript');
    expect(text).toContain('Tech stacks: NestJS');
    expect(text).toContain('Minimum experience years: 1');
  });

  it('formats a structured review for the applicant record', () => {
    const text = formatCvReview({
      overallScore: 75,
      criteria: [
        {
          name: 'skills',
          score: 75,
          explanation: 'Phù hợp',
          evidence: ['Có TypeScript'],
        },
        {
          name: 'experience',
          score: 75,
          explanation: 'Đủ kinh nghiệm',
          evidence: [],
        },
        {
          name: 'education',
          score: 75,
          explanation: 'Phù hợp',
          evidence: [],
        },
        {
          name: 'jobRequirements',
          score: 75,
          explanation: 'Đáp ứng',
          evidence: [],
        },
      ],
      strengths: ['TypeScript'],
      weaknesses: [],
      summary: 'Có thể phỏng vấn',
      missingInformation: [],
    });

    expect(text).toContain('Điểm số: 75/100');
    expect(text).toContain('Kỹ năng: Phù hợp Dẫn chứng: Có TypeScript.');
    expect(text).toContain('Điểm yếu: Chưa xác định');
  });

  it('leaves valid file names unchanged and escapes regular expressions', () => {
    expect(decodeUploadFileName('Nguyen-Van-A.pdf')).toBe('Nguyen-Van-A.pdf');
    expect(escapeRegex('C++ (Senior)')).toBe('C\\+\\+ \\(Senior\\)');
  });
});
