import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CvsService } from './cvs.service.js';

function createService(name: string | null, email: string | null) {
  const cv = {
    extractedData: {
      name,
      position: 'Backend Developer',
      experience_years: 0,
      email,
      phone_number: null,
      tech_stacks: [],
      review: null,
    },
  };
  const cvModel = { findOne: vi.fn().mockResolvedValue(cv) };
  const applicantModel = { findOneAndUpdate: vi.fn() };
  const service = new CvsService(
    cvModel as never,
    applicantModel as never,
    {} as never,
    {} as never,
    {} as never,
    { findForApproval: vi.fn() } as never,
    {} as never,
  );
  return { service, applicantModel };
}

describe('CvsService.approve', () => {
  it.each([
    ['missing name', '  ', 'candidate@example.com'],
    ['missing email', 'Candidate', null],
    ['invalid email', 'Candidate', 'not-an-email'],
  ])('rejects %s before saving an applicant', async (_case, name, email) => {
    const { service, applicantModel } = createService(name, email);

    await expect(
      service.approve('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(applicantModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
