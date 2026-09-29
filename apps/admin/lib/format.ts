export function ago(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return dateShort(d);
}

export function dateShort(d: string | Date) {
  const x = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' }).format(x);
}

export function dateTime(d: string | Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' }).format(typeof d === 'string' ? new Date(d) : d);
}

export function dateRange(a: string | null, b: string | null) {
  if (!a) return 'Flexible';
  const f = (x: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${x}T12:00:00Z`));
  const nights = b ? Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) : null;
  return `${f(a)}${b ? ` → ${f(b)}` : ''}${nights ? ` · ${nights} night${nights > 1 ? 's' : ''}` : ''}`;
}

export function bytes(n: number) {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}
