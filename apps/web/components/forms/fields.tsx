'use client';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface Base {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn('field', className)}>
      <label htmlFor={id}>
        {label}
        {props.required && <span className="text-accent"> *</span>}
      </label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} {...props} />
      {error ? <p id={`${id}-e`} className="error">{error}</p> : hint ? <p id={`${id}-h`} className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, error, hint, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={cn('field', className)}>
      <label htmlFor={id}>
        {label}
        {props.required && <span className="text-accent"> *</span>}
      </label>
      <textarea id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...props} />
      {error ? <p id={`${id}-e`} className="error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Select({ label, error, className, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={cn('field', className)}>
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" aria-invalid={!!error} {...props}>
        {children}
      </select>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function Check({ label, error, name, defaultChecked, required }: { label: ReactNode; error?: string; name: string; defaultChecked?: boolean; required?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 !font-normal text-fg-muted">
        <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} required={required} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" aria-invalid={!!error} />
        <span className="text-sm leading-relaxed">{label}</span>
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/** Honeypot: invisible to people, tempting to bots. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
