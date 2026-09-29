export const HOTEL_TZ = 'Africa/Kampala';

/** Today's business date (YYYY-MM-DD) in the hotel's timezone. */
export function hotelToday(now: Date = new Date(), tz: string = HOTEL_TZ): string {
  return toIsoDate(now, tz);
}

export function toIsoDate(d: Date, tz: string = HOTEL_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts; // en-CA yields YYYY-MM-DD
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(arrival: string, departure: string): number {
  const ms = Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function formatDate(
  d: Date | string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  tz: string = HOTEL_TZ,
): string {
  const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: tz }).format(date);
}
