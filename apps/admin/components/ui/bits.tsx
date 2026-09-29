'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-surface-2 text-fg-muted border-line',
  green: 'bg-success/10 text-success border-success/20',
  amber: 'bg-warning/10 text-warning border-warning/25',
  red: 'bg-danger/10 text-danger border-danger/20',
  blue: 'bg-info/10 text-info border-info/20',
  dark: 'bg-fg text-bg border-transparent',
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-semibold', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, Tone> = {
  PUBLISHED: 'green', AVAILABLE: 'green', ACTIVE: 'green', DONE: 'neutral', READY: 'green', CONVERTED: 'green',
  DRAFT: 'amber', SCHEDULED: 'blue', COMING_SOON: 'amber', PROCESSING: 'blue', INVITED: 'blue', WAITING_GUEST: 'blue', CONTACTED: 'blue',
  NEW: 'red', OPEN: 'amber', HIDDEN: 'neutral', ARCHIVED: 'neutral', DISABLED: 'neutral', SPAM: 'neutral', DECLINED: 'neutral', EXPIRED: 'neutral', FAILED: 'red',
};
export const STATUS_LABEL: Record<string, string> = {
  WAITING_GUEST: 'Waiting on guest', COMING_SOON: 'Being built', NEW: 'New', OPEN: 'Open', DONE: 'Done', SPAM: 'Spam', DRAFT: 'Draft',
  PUBLISHED: 'Published', SCHEDULED: 'Scheduled', HIDDEN: 'Hidden', AVAILABLE: 'Available', CONTACTED: 'Contacted', CONVERTED: 'Converted',
  DECLINED: 'Declined', EXPIRED: 'Expired', ACTIVE: 'Active', INVITED: 'Invited', DISABLED: 'Disabled', ARCHIVED: 'Archived', READY: 'Ready', PROCESSING: 'Processing', FAILED: 'Failed',
};

export function Status({ value }: { value: string }) {
  return (
    <Pill tone={STATUS_TONE[value] ?? 'neutral'} dot>
      {STATUS_LABEL[value] ?? value.toLowerCase()}
    </Pill>
  );
}

export function PageHeader({ title, description, actions, crumbs, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[]; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12.5px] text-fg-subtle">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[1.9rem] leading-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[13.5px] text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-surface-2 text-fg-subtle">{icon}</div>}
      <p className="text-[15px] font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-fg-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn('relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors', value === it.value ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg')}
        >
          {it.label}
          {it.count !== undefined && <span className="rounded-full bg-surface-2 px-1.5 text-[11px] tabular text-fg-subtle">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-fg-muted">{children}</kbd>;
}

export function Section({ title, description, children, actions, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn('card', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-[14px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] text-fg-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
