// Ask the website to drop its content cache (same signed call the API makes after a publish).
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const body = JSON.stringify({ tags: ['content'], ts: Date.now() });
const sig = createHmac('sha256', env.REVALIDATE_SECRET).update(body).digest('hex');
const res = await fetch(`${env.WEB_URL}/api/revalidate`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body });
console.log(res.status, await res.text());
