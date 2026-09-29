import { t, type LText } from '@reberon/contracts';
import { formatMoney, type Currency } from '@reberon/utils';

export { t };

export function price(minor: string | null, currency: Currency) {
  if (!minor) return null;
  return formatMoney(minor, currency, { compact: false }).replace(/\.00$/, '');
}

export function driveTime(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m.toString().padStart(2, '0')}` : `${h} h`;
}

export function titleOf(v: LText | undefined | null, fallback = '') {
  return t(v) || fallback;
}

export function dateLong(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(`${iso}T12:00:00Z`));
}

export function monthYear(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(`${iso}T12:00:00Z`));
}
