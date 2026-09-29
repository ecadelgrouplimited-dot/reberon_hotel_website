import { formatMoney, type Currency } from '@reberon/utils';

export const money = (minor: string | number | bigint | null | undefined, currency: string) =>
  minor === null || minor === undefined ? '—' : formatMoney(BigInt(minor), currency as Currency).replace(/\.00$/, '');

/** Major units typed by a person → minor-unit string for the API. */
export const toMinorStr = (major: string, currency: string) => {
  const n = Number(major.replace(/[,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.round(currency === 'USD' ? n * 100 : n));
};
