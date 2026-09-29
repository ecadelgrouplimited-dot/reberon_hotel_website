import { revalidateTag } from 'next/cache';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Called by the API after anything is published. HMAC-signed, rejects stale
 * timestamps. `expire: 0` so the very next visitor gets fresh content.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 500 });
  const body = await req.text();
  const sig = req.headers.get('x-signature') ?? '';
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { tags, ts } = JSON.parse(body) as { tags: string[]; ts: number };
  if (Math.abs(Date.now() - ts) > 60_000) return Response.json({ ok: false, reason: 'stale' }, { status: 401 });
  for (const tag of new Set(['content', ...tags])) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tags.length });
}
