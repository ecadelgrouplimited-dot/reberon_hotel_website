'use client';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'touch' | 'icon';

const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_1px_0_rgb(255_255_255/.15)_inset,0_6px_16px_-8px_rgb(158_42_43/.6)]',
  secondary: 'border border-line-strong bg-surface text-fg hover:border-fg/40 hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'border border-danger/30 bg-danger/5 text-danger hover:bg-danger hover:text-white',
  dark: 'bg-fg text-bg hover:opacity-90',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px]',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-11 px-5 text-sm',
  /** 56px: the desk and housekeeping, used standing up, on a tablet or a phone. */
  touch: 'h-14 px-6 text-[15px]',
  icon: 'size-9',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  href?: string;
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, href, className, children, disabled, ...props }: Props) {
  const content = (
    <>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={buttonClass(variant, size, className)}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {content}
    </button>
  );
}
