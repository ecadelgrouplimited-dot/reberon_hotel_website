export const CURRENCIES = ['UGX', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Decimal places used for minor units. UGX has no minor unit in practice. */
export const CURRENCY_EXPONENT: Record<Currency, number> = { UGX: 0, USD: 2 };

export interface Money {
  amountMinor: bigint;
  currency: Currency;
}

export function money(amountMinor: bigint | number | string, currency: Currency): Money {
  return { amountMinor: BigInt(amountMinor), currency };
}

/** Convert a major-unit value (e.g. 70 USD) to minor units (7000). */
export function toMinor(major: number, currency: Currency): bigint {
  return BigInt(Math.round(major * 10 ** CURRENCY_EXPONENT[currency]));
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

/** Format for display. Never converts between currencies. */
export function formatMoney(
  amountMinor: bigint | number | string,
  currency: Currency,
  opts: { compact?: boolean; locale?: string } = {},
): string {
  const exp = CURRENCY_EXPONENT[currency];
  const major = Number(BigInt(amountMinor)) / 10 ** exp;
  return new Intl.NumberFormat(opts.locale ?? 'en-UG', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'UGX' ? 'code' : 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: opts.compact ? 0 : exp,
    notation: opts.compact ? 'compact' : 'standard',
  }).format(major);
}
