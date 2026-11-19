import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CvGeneratorService } from './cv-generator.service.js';
import { Cv } from './entities/cv.entity.js';

describe('CvGeneratorService', () => {
  it('does not report an old PDF when conversion fails', async () => {
    const service = new CvGeneratorService();
    const cvId = randomUUID();
    const pdfPath = service.generatedPath(cvId, 'pdf');
    const previousConverter = process.env.DOCX_TO_PDF_BIN;
    await mkdir(dirname(pdfPath), { recursive: true });
    await writeFile(pdfPath, 'old PDF');
    process.env.DOCX_TO_PDF_BIN = 'missing-cv-pdf-converter';

    try {
      const cv = {
        extractedData: {
          name: 'Candidate',
          position: 'Backend Developer',
          tech_stacks: [],
          experience_years: 0,
          email: 'candidate@example.com',
          phone_number: '',
          review: '',
        },
        review: { summary: 'Review' },
      } as unknown as Cv;

      const generated = await service.generate(cv, cvId);

      expect(generated.pdf).toBeNull();
      await expect(access(pdfPath)).rejects.toThrow();
    } finally {
      if (previousConverter === undefined) {
        delete process.env.DOCX_TO_PDF_BIN;
      } else {
        process.env.DOCX_TO_PDF_BIN = previousConverter;
      }
      await rm(dirname(pdfPath), { recursive: true, force: true });
    }
  });
});
