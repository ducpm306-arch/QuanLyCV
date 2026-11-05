import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';

const builtInTypes = new Set<Function>([
  String,
  Boolean,
  Number,
  Array,
  Object,
]);

@Injectable()
export class DtoValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype;

    if (
      !metatype ||
      builtInTypes.has(metatype) ||
      value === null ||
      value === undefined
    ) {
      return value;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Body phải là JSON object hợp lệ');
    }

    const dto = Object.assign(new (metatype as new () => object)(), value);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      );
    }

    return dto;
  }
}
