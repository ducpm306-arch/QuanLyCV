import { createCanvas, loadImage } from '@napi-rs/canvas';
import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const execFileAsync = promisify(execFile);
const relationshipNamespace =
  'http://schemas.openxmlformats.org/package/2006/relationships';
const drawingNamespace =
  'http://schemas.openxmlformats.org/drawingml/2006/main';
const vmlNamespace = 'urn:schemas-microsoft-com:vml';
const officeRelationshipNamespace =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

type Matrix = [number, number, number, number, number, number];
type PhotoCandidate = { x: number; y: number; width: number; height: number; score: number };

function isPortrait(width: number, height: number) {
  const ratio = width / height;
  return width >= 90 && height >= 90 && ratio >= 0.58 && ratio <= 1.35;
}

async function cropPortrait(image: Buffer) {
  const source = await loadImage(image);
  const canvas = createCanvas(300, 360);
  const context = canvas.getContext('2d');
  const scale = Math.max(300 / source.width, 360 / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  context.drawImage(source, (300 - width) / 2, (360 - height) / 2, width, height);
  return canvas.toBuffer('image/png');
}

async function extractDocxPhoto(filePath: string): Promise<Buffer | null> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const documentXml = zip.file('word/document.xml');
  const relationshipsXml = zip.file('word/_rels/document.xml.rels');
  if (!documentXml || !relationshipsXml) return null;

  const document = new DOMParser().parseFromString(
    await documentXml.async('string'),
    'application/xml',
  );
  const relationships = new DOMParser().parseFromString(
    await relationshipsXml.async('string'),
    'application/xml',
  );
  const targets = new Map<string, string>();
  for (const relation of Array.from(
    relationships.getElementsByTagNameNS(relationshipNamespace, 'Relationship'),
  )) {
    if (relation.getAttribute('Type')?.endsWith('/image')) {
      targets.set(relation.getAttribute('Id') || '', relation.getAttribute('Target') || '');
    }
  }

  let best: { data: Buffer; score: number } | null = null;
  const images = [
    ...Array.from(document.getElementsByTagNameNS(drawingNamespace, 'blip')),
    ...Array.from(document.getElementsByTagNameNS(vmlNamespace, 'imagedata')),
  ];
  for (const [index, imageNode] of images.entries()) {
    const relationshipId =
      imageNode.getAttributeNS(officeRelationshipNamespace, 'embed') ||
      imageNode.getAttributeNS(officeRelationshipNamespace, 'id') || '';
    const target = targets.get(relationshipId);
    if (!target || target.includes('..')) continue;
    const entry = zip.file(`word/${target.replace(/^\//, '')}`);
    if (!entry) continue;
    try {
      const data = await entry.async('nodebuffer');
      const image = await loadImage(data);
      if (!isPortrait(image.width, image.height)) continue;
      const score = Math.min(image.width * image.height, 1_000_000) / 100_000
        - Math.abs(image.width / image.height - 0.82) * 5 - index;
      if (!best || score > best.score) best = { data, score };
    } catch {
      // Unsupported image formats are ignored.
    }
  }
  return best ? cropPortrait(best.data) : null;
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

type PhotoBox = { x: number; y: number; width: number; height: number };

async function extractPdfPhoto(
  filePath: string,
  locatePhoto?: (page: Buffer) => Promise<PhotoBox | null>,
): Promise<Buffer | null> {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(filePath)) }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const operators = await page.getOperatorList();
    const stack: Matrix[] = [];
    let transform: Matrix = [1, 0, 0, 1, 0, 0];
    let best: PhotoCandidate | null = null;

    for (let index = 0; index < operators.fnArray.length; index += 1) {
      const operation = operators.fnArray[index];
      const args = operators.argsArray[index];
      if (operation === OPS.save) stack.push([...transform]);
      else if (operation === OPS.restore) transform = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (operation === OPS.transform) transform = multiply(transform, args as Matrix);
      else if (
        operation === OPS.paintImageXObject ||
        operation === OPS.paintInlineImageXObject
      ) {
        const points = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) =>
          viewport.convertToViewportPoint(
            transform[0] * x + transform[2] * y + transform[4],
            transform[1] * x + transform[3] * y + transform[5],
          ),
        );
        const x = Math.min(...points.map((point) => point[0]));
        const y = Math.min(...points.map((point) => point[1]));
        const width = Math.max(...points.map((point) => point[0])) - x;
        const height = Math.max(...points.map((point) => point[1])) - y;
        const ratio = width / height;
        if (
          width < 80 || height < 80 ||
          width > viewport.width * 0.42 || height > viewport.height * 0.5 ||
          y > viewport.height * 0.55 ||
          ratio < 0.58 || ratio > 1.35
        ) continue;
        const score = width * height / 10_000 - Math.abs(ratio - 0.82) * 5 - y / 100;
        if (!best || score > best.score) best = { x, y, width, height, score };
      }
    }
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    if (!best && !locatePhoto) return null;
    await page.render({
      canvasContext: canvas.getContext('2d') as any,
      viewport,
      canvas: canvas as any,
    } as any).promise;
    if (!best && locatePhoto) {
      const box = await locatePhoto(canvas.toBuffer('image/png'));
      if (box) best = {
        x: box.x * canvas.width,
        y: box.y * canvas.height,
        width: box.width * canvas.width,
        height: box.height * canvas.height,
        score: 0,
      };
    }
    if (!best) return null;
    const cropped = createCanvas(Math.ceil(best.width), Math.ceil(best.height));
    cropped.getContext('2d').drawImage(
      canvas,
      best.x, best.y, best.width, best.height,
      0, 0, cropped.width, cropped.height,
    );
    return cropPortrait(cropped.toBuffer('image/png'));
  } finally {
    await pdf.destroy();
  }
}

export async function extractCandidatePhoto(
  filePath: string,
  mimeType: string,
  locatePhoto?: (page: Buffer) => Promise<PhotoBox | null>,
) {
  if (mimeType === 'application/pdf') return extractPdfPhoto(filePath, locatePhoto);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocxPhoto(filePath);
  }
  if (mimeType !== 'application/msword' && mimeType !== 'application/vnd.ms-word') return null;

  const directory = await mkdtemp(join(tmpdir(), 'cv-photo-'));
  try {
    await execFileAsync(process.env.DOCX_TO_PDF_BIN || 'soffice', [
      '--headless', '--convert-to', 'docx', '--outdir', directory, filePath,
    ]);
    return await extractDocxPhoto(join(directory, `${basename(filePath).replace(/\.[^.]+$/, '')}.docx`));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
