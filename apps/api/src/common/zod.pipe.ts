import { HttpStatus, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppError } from './errors.js';

export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const res = this.schema.safeParse(value);
    if (res.success) return res.data;
    throw new AppError(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_FAILED',
      'Some fields need attention.',
      res.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
}
