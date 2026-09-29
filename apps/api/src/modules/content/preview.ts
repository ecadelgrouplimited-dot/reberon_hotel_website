import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config.js';

/** Short-lived signed token that lets the website render drafts. */
export function signPreviewToken(ttlSeconds = 60 * 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac('sha256', env.PREVIEW_SECRET).update(String(exp)).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifyPreviewToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const expected = createHmac('sha256', env.PREVIEW_SECRET).update(exp).digest('base64url');
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
