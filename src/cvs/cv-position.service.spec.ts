import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { CvPositionService } from './cv-position.service.js';

function createService(positionNames: string[]) {
  const positions = positionNames.map((name) => ({
    _id: new Types.ObjectId(),
    name,
  }));

  const query = {
    select: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  query.exec.mockResolvedValue(positions);

  const positionModel = {
    find: vi.fn().mockReturnValue(query),
  };

  return {
    service: new CvPositionService(positionModel as never),
    positions,
  };
}

describe('CvPositionService', () => {
  it('matches a position after removing seniority words', async () => {
    const { service, positions } = createService([
      'Backend Developer',
      'Frontend Developer',
    ]);

    const result = await service.findClosest('Senior Back-end Engineer');

    expect(result?._id).toEqual(positions[0]._id);
  });

  it('returns null when two positions have the same score', async () => {
    const { service } = createService([
      'Backend Java Developer',
      'Backend Node Developer',
    ]);

    const result = await service.findClosest('Backend Developer');

    expect(result).toBeNull();
  });

  it('returns null when the input only contains ignored words', async () => {
    const { service } = createService(['Backend Developer']);

    const result = await service.findClosest('Senior Developer');

    expect(result).toBeNull();
  });
});
