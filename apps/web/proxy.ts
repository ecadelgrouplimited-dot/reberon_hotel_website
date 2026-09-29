import { NextResponse, type NextRequest } from 'next/server';

/**
 * Redirects managed in the House (and created automatically when a published
 * page changes its address). Cached briefly in memory per instance.
 */
let cache: { at: number; map: Map<string, { to: string; code: number }> } | null = null;

async function redirects() {
  if (cache && Date.now() - cache.at < 60_000) return cache.map;
  try {
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/v1/public/redirects`, { cache: 'no-store' });
    const list = (await res.json()) as { fromPath: string; toPath: string; statusCode: number }[];
    cache = { at: Date.now(), map: new Map(list.map((r) => [r.fromPath.replace(/\/$/, '') || '/', { to: r.toPath, code: r.statusCode }])) };
  } catch {
    cache = { at: Date.now(), map: cache?.map ?? new Map() };
  }
  return cache.map;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/$/, '') || '/';
  const hit = (await redirects()).get(path);
  if (hit) return NextResponse.redirect(new URL(hit.to, req.url), hit.code);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|icon|favicon|manifest|robots|sitemap|.*\\.(?:svg|png|jpg|webp|ico|txt|xml)$).*)'],
};
