import { describe, expect, it } from 'vitest';
import { defaultPositions } from './seed-data.js';

describe('default seed data', () => {
  it('has unique position names', () => {
    const names = defaultPositions.map((position) => position.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has unique tech stack names inside each position', () => {
    for (const position of defaultPositions) {
      expect(new Set(position.techStacks).size).toBe(
        position.techStacks.length,
      );
    }
  });

  it('contains enough information to create each position', () => {
    for (const position of defaultPositions) {
      expect(position.name).not.toBe('');
      expect(position.description).not.toBe('');
      expect(position.requiredSkills.length).toBeGreaterThan(0);
      expect(position.techStacks.length).toBeGreaterThan(0);
    }
  });
});
