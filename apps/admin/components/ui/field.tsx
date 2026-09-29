'use client';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function FieldShell({ label, hint, error, children, className, htmlFor, required, aside }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string; htmlFor?: string; required?: boolean; aside?: ReactNode }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="label">
              {label}
              {required && <span className="text-accent"> *</span>}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? <p className="err">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

type Common = { label?: ReactNode; hint?: ReactNode; error?: string; wrapClassName?: string; aside?: ReactNode };

export function TextInput({ label, hint, error, wrapClassName, aside, className, ...p }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} className={wrapClassName} htmlFor={id} required={p.required} aside={aside}>
      <input id={id} className={cn('input', className)} aria-invalid={!!error} {...p} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, wrapClassName, aside, className, ...p }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} className={wrapClassName} htmlFor={id} required={p.required} aside={aside}>
      <textarea id={id} className={cn('input', className)} aria-invalid={!!error} {...p} />
    </FieldShell>
  );
}

export function SelectInput({ label, hint, error, wrapClassName, className, children, ...p }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} className={wrapClassName} htmlFor={id}>
      <select id={id} className={cn('input', className)} aria-invalid={!!error} {...p}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        <span className="label block">{label}</span>
        {hint && <span className="hint mt-0.5 block">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-moss-700' : 'bg-line-strong')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}
