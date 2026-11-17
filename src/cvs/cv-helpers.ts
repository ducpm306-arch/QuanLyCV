import { Position } from '../positions/entities/position.entity.js';
import type { CvReview } from '../ai/schemas/extracted-cv.schema.js';

export function normalizeTechStack(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function positionTerms(value: string) {
  const ignoredTerms = new Set([
    'thuc',
    'tap',
    'sinh',
    'intern',
    'internship',
    'junior',
    'senior',
    'fresher',
    'developer',
    'engineer',
    'ky',
    'su',
    'lap',
    'trinh',
    'vien',
  ]);

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bback[\s-]?end\b/g, 'backend')
    .replace(/\bfront[\s-]?end\b/g, 'frontend')
    .replace(/\bfull[\s-]?stack\b/g, 'fullstack')
    .replace(/[^a-z0-9+#.]+/g, ' ');

  const result = new Set<string>();
  const terms = normalized.split(/\s+/);
  for (const term of terms) {
    if (term && !ignoredTerms.has(term)) {
      result.add(term);
    }
  }
  return result;
}

export function positionToText(position: Position, techStacks: string[]) {
  return [
    `Position: ${position.name}`,
    `Description: ${position.description}`,
    `Required skills: ${position.requiredSkills.join(', ')}`,
    `Preferred skills: ${position.preferredSkills.join(', ')}`,
    `Tech stacks: ${techStacks.join(', ')}`,
    `Minimum experience years: ${position.minExperienceYears}`,
    `Education: ${position.educationRequirements ?? ''}`,
  ].join('\n');
}

export function positionHasJobRequirements(
  position: Position,
  techStacks: string[],
) {
  if (position.description && position.description.trim()) return true;
  if (position.requiredSkills.length > 0) return true;
  if (position.preferredSkills.length > 0) return true;
  if (techStacks.length > 0) return true;
  if (position.minExperienceYears > 0) return true;
  if (position.educationRequirements && position.educationRequirements.trim()) {
    return true;
  }
  return false;
}

export function formatCvReview(review: CvReview) {
  const criteriaLabels: Record<string, string> = {
    skills: 'Kỹ năng',
    experience: 'Kinh nghiệm',
    education: 'Trình độ',
    jobRequirements: 'Yêu cầu công việc',
  };

  const reasonLines: string[] = [];
  for (const criterion of review.criteria) {
    const label = criteriaLabels[criterion.name] || criterion.name;
    let evidence = '';
    if (criterion.evidence.length > 0) {
      evidence = ` Dẫn chứng: ${criterion.evidence.join('; ')}.`;
    }
    reasonLines.push(`${label}: ${criterion.explanation}${evidence}`);
  }

  return [
    `Điểm số: ${review.overallScore}/100`,
    `Nhận xét: ${review.summary}`,
    `Điểm mạnh: ${review.strengths.join('; ') || 'Chưa xác định'}`,
    `Điểm yếu: ${review.weaknesses.join('; ') || 'Chưa xác định'}`,
    `Lý do đánh giá:\n${reasonLines.join('\n')}`,
  ].join('\n\n');
}

export function decodeUploadFileName(value: string) {
  if (!/[ÃÄÅÆÐ]|á[º»]/.test(value)) {
    return value;
  }

  const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  if (decoded.includes('\uFFFD')) {
    return value;
  }
  return decoded;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
