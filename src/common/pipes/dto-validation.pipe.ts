import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';

const typesWithoutValidation = new Set<Function>([
  String,
  Boolean,
  Number,
  Array,
  Object,
]);

@Injectable()
export class DtoValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    const dtoClass = metadata.metatype;

    if (!dtoClass || typesWithoutValidation.has(dtoClass)) {
      return value;
    }
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Body phải là JSON object hợp lệ');
    }

    const dto = Object.assign(new (dtoClass as new () => object)(), value);
    // These flags follow class-validator's documented whitelisting behavior.
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages: string[] = [];
      for (const error of errors) {
        const constraints = error.constraints || {};
        messages.push(...Object.values(constraints));
      }
      throw new BadRequestException(messages);
    }

    return dto;
  }
}
