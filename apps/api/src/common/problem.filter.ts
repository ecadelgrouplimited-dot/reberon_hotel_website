import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response, Request } from 'express';
import { Prisma } from '@reberon/db';
import { ThrottlerException } from '@nestjs/throttler';

/** Every error leaves the API as RFC 9457 problem+json with a stable `code`. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly log = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { code: 'INTERNAL', detail: 'Something went wrong on our side.' };

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      body = { code: 'RATE_LIMITED', detail: 'Too many requests. Please wait a minute and try again.' };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'object' && r && 'code' in r ? (r as Record<string, unknown>) : { code: statusCode(status), detail: exception.message };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        body = { code: 'CONFLICT', detail: `That ${target ?? 'value'} is already in use.`, errors: target ? [{ path: target, message: 'Already in use' }] : undefined };
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        body = { code: 'NOT_FOUND', detail: 'Not found' };
      }
    }
    if (status >= 500) this.log.error(`${req.method} ${req.url}`, (exception as Error)?.stack);

    res
      .status(status)
      .type('application/problem+json')
      .json({ type: 'about:blank', title: (HttpStatus[status] ?? 'Error').toString().toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()), status, ...body });
  }
}

function statusCode(status: number) {
  if (status === 404) return 'NOT_FOUND';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 400) return 'BAD_REQUEST';
  return 'ERROR';
}
