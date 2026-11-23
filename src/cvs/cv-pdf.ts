import { PDFDocument, loadImage } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';

const pageWidth = 595;
const pageHeight = 842;
const margin = 42;
const leftWidth = 143;
const rightWidth = pageWidth - margin * 2 - leftWidth;
const lineHeight = 15;

function wrapText(
  context: ReturnType<PDFDocument['beginPage']>,
  value: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  for (const paragraph of value.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function renderCvPdf(
  values: Record<string, string>,
  photo: Buffer | null,
) {
  const pdf = new PDFDocument({ title: 'CV ứng viên', creator: 'Quản lý CV' });
  let context = pdf.beginPage(pageWidth, pageHeight);
  let y = margin;
  let segmentStart = margin;
  context.font = '11px Arial';
  if (photo) {
    const image = await loadImage(photo);
    (context as SKRSContext2D).drawImage(image, margin + 16, margin + 17, 111, 133);
  }

  const finishPage = () => {
    context.strokeStyle = '#333333';
    context.lineWidth = 0.8;
    context.strokeRect(margin, segmentStart, leftWidth, y - segmentStart);
    pdf.endPage();
  };

  const nextPage = () => {
    finishPage();
    context = pdf.beginPage(pageWidth, pageHeight);
    context.font = '11px Arial';
    y = margin;
    segmentStart = margin;
  };

  for (const [label, value] of Object.entries(values)) {
    const lines = wrapText(context, `${label} ${value}`, rightWidth - 20);
    let offset = 0;
    while (offset < lines.length) {
      const remaining = pageHeight - margin - y;
      if (remaining < 34) nextPage();
      const availableLines = Math.max(
        1,
        Math.floor((pageHeight - margin - y - 14) / lineHeight),
      );
      const chunk = lines.slice(offset, offset + availableLines);
      const height = Math.max(34, chunk.length * lineHeight + 14);
      context.strokeStyle = '#333333';
      context.lineWidth = 0.8;
      context.strokeRect(margin + leftWidth, y, rightWidth, height);
      context.fillStyle = '#171717';
      context.font = '11px Arial';
      chunk.forEach((line, index) => {
        context.fillText(line, margin + leftWidth + 10, y + 19 + index * lineHeight);
      });
      y += height;
      offset += chunk.length;
      if (offset < lines.length) nextPage();
    }
  }

  finishPage();
  return pdf.close();
}
