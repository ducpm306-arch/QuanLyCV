import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';

export const cvUploadDirectory = join(process.cwd(), 'uploads', 'cvs');

export const cvUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(cvUploadDirectory, { recursive: true });
      callback(null, cvUploadDirectory);
    },

    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.ms-word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Chỉ chấp nhận file PDF, DOC hoặc DOCX'),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
