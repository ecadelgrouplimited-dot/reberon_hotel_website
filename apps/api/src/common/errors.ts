import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'CONFLICT_VERSION'
  | 'RATE_LIMITED'
  | 'IN_USE'
  | 'BAD_REQUEST';

export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    detail: string,
    readonly errors?: { path: string; message: string }[],
  ) {
    super({ code, detail, errors }, status);
  }
}

export const notFound = (what = 'Resource') => new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', `${what} not found`);
export const forbidden = (detail = 'You do not have permission to do that') => new AppError(HttpStatus.FORBIDDEN, 'FORBIDDEN', detail);
export const unauthorized = (detail = 'Please sign in') => new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', detail);
export const conflict = (detail: string, code: ErrorCode = 'CONFLICT') => new AppError(HttpStatus.CONFLICT, code, detail);
export const badRequest = (detail: string, errors?: { path: string; message: string }[]) =>
  new AppError(HttpStatus.BAD_REQUEST, 'BAD_REQUEST', detail, errors);
