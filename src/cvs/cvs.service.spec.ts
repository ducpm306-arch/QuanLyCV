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

describe('CvsService.remove', () => {
  it('soft deletes the CV, applicant, and linked tech stacks', async () => {
    const cv = {
      _id: '507f1f77bcf86cd799439011',
      deletedAt: null as Date | null,
      save: vi.fn(),
    };
    const applicant = {
      _id: '507f1f77bcf86cd799439012',
      deletedAt: null as Date | null,
      save: vi.fn(),
    };
    const applicantModel = { findOne: vi.fn().mockResolvedValue(applicant) };
    const applicantTechStackModel = { updateMany: vi.fn() };
    const service = new CvsService(
      { findOne: vi.fn().mockResolvedValue(cv) } as never,
      applicantModel as never,
      applicantTechStackModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.remove(cv._id);

    expect(cv.deletedAt).toBeInstanceOf(Date);
    expect(applicant.deletedAt).toEqual(cv.deletedAt);
    expect(applicantTechStackModel.updateMany).toHaveBeenCalledWith(
      { applicant: applicant._id, deletedAt: null },
      { $set: { deletedAt: cv.deletedAt } },
    );
    expect(cv.save).toHaveBeenCalledOnce();
  });
});
