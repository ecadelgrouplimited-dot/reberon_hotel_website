'use client';
import type { PriceDTO } from '@reberon/contracts';
import { formatMoney } from '@reberon/utils';
import { cn } from '@/lib/cn';
import { useSite } from './site-provider';

/** Shows the price in the visitor's chosen currency. Never converts: missing USD falls back to UGX. */
export function Price({ price, className, prefix = 'From', suffix = '/ night' }: { price: PriceDTO; className?: string; prefix?: string; suffix?: string }) {
  const { currency } = useSite();
  const useUsd = currency === 'USD' && price.usd;
  const minor = useUsd ? price.usd : price.ugx;
  if (!minor) return null;
  const amount = formatMoney(minor, useUsd ? 'USD' : 'UGX').replace(/\.00$/, '');
  return (
    <span className={cn('tabular', className)}>
      {prefix && <span className="text-fg-subtle">{prefix} </span>}
      <span className="font-semibold text-fg">{amount}</span>
      {suffix && <span className="text-fg-subtle"> {suffix}</span>}
    </span>
  );
}

export function CurrencyToggle({ className }: { className?: string }) {
  const { currency, setCurrency, site } = useSite();
  if (site.currencies.length < 2) return null;
  return (
    <div role="group" aria-label="Currency" className={cn('inline-flex rounded-full border border-line p-0.5 text-xs font-semibold', className)}>
      {(['UGX', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          onClick={() => setCurrency(c)}
          className={cn('rounded-full px-3 py-1.5 transition-colors', currency === c ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg')}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
