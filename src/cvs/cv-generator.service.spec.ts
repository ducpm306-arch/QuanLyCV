import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { CvGeneratorService } from './cv-generator.service.js';
import { Cv } from './entities/cv.entity.js';

describe('CvGeneratorService', () => {
  it('copies a portrait from the original DOCX into the generated CV', async () => {
    const service = new CvGeneratorService();
    const cvId = randomUUID();
    const sourceName = `${cvId}.docx`;
    const sourcePath = join(process.cwd(), 'uploads', 'cvs', sourceName);
    const previousConverter = process.env.DOCX_TO_PDF_BIN;
    process.env.DOCX_TO_PDF_BIN = 'missing-cv-pdf-converter';
    await mkdir(dirname(sourcePath), { recursive: true });

    try {
      const zip = await JSZip.loadAsync(
        await readFile(join(process.cwd(), 'templates', 'company-cv-template.docx')),
      );
      const canvas = createCanvas(200, 240);
      canvas.getContext('2d').fillRect(0, 0, 200, 240);
      zip.file('word/media/portrait.png', canvas.toBuffer('image/png'));
      const documentXml = await zip.file('word/document.xml')!.async('string');
      zip.file('word/document.xml', documentXml.replace(
        '</w:body>', '<w:p><w:r><w:drawing><a:blip r:embed="rIdPhoto"/></w:drawing></w:r></w:p></w:body>',
      ));
      const relationshipsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
      zip.file('word/_rels/document.xml.rels', relationshipsXml.replace(
        '</Relationships>',
        '<Relationship Id="rIdPhoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/portrait.png"/></Relationships>',
      ));
      await writeFile(sourcePath, await zip.generateAsync({ type: 'nodebuffer' }));

      const cv = {
        file: sourceName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extractedData: { name: 'Candidate' },
        review: { summary: 'Review' },
      } as unknown as Cv;
      await service.generate(cv, cvId);

      const output = await JSZip.loadAsync(
        await readFile(service.generatedPath(cvId, 'docx')),
      );
      expect(output.file('word/media/candidate-photo.png')).not.toBeNull();
      expect(await output.file('word/document.xml')!.async('string')).toContain('Candidate photo');
      expect(await output.file('word/_rels/document.xml.rels')!.async('string'))
        .toContain('media/candidate-photo.png');
    } finally {
      if (previousConverter === undefined) delete process.env.DOCX_TO_PDF_BIN;
      else process.env.DOCX_TO_PDF_BIN = previousConverter;
      await rm(sourcePath, { force: true });
      await rm(dirname(service.generatedPath(cvId, 'docx')), { recursive: true, force: true });
    }
  });

  it('replaces an old PDF with a valid PDF when LibreOffice is unavailable', async () => {
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

      expect(generated.pdf).toContain('cv.pdf');
      const pdfData = await readFile(pdfPath);
      expect(pdfData.subarray(0, 4).toString()).toBe('%PDF');
      const pdf = await getDocument({ data: new Uint8Array(pdfData) }).promise;
      expect(pdf.numPages).toBeGreaterThan(0);
      await pdf.destroy();
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
