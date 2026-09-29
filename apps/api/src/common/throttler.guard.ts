import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Sign-in attempts are limited per IP *and* email (docs/planning/10-security.md):
 * colleagues behind the same hotel router do not share one budget, while
 * guessing at one account from one address is still slowed down.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (email && /\/auth\/(login|forgot)$/.test(req.path ?? '')) return `${req.ip}:${email}`;
    return req.ip;
  }
}
