'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

type Mode = 'light' | 'dark' | 'system';

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>('system');
  useEffect(() => {
    try {
      const v = localStorage.getItem('rb-theme');
      if (v === 'light' || v === 'dark') setMode(v);
    } catch {}
  }, []);
  const apply = (m: Mode) => {
    setMode(m);
    const d = document.documentElement;
    if (m === 'system') d.removeAttribute('data-theme');
    else d.setAttribute('data-theme', m);
    try {
      if (m === 'system') localStorage.removeItem('rb-theme');
      else localStorage.setItem('rb-theme', m);
    } catch {}
  };
  const opts: [Mode, typeof Sun, string][] = [
    ['light', Sun, 'Light'],
    ['dark', Moon, 'Night on Elgon'],
    ['system', Monitor, 'Match device'],
  ];
  return (
    <div role="group" aria-label="Theme" className={cn('inline-flex rounded-full border border-line p-0.5', className)}>
      {opts.map(([m, I, label]) => (
        <button key={m} type="button" title={label} aria-label={label} aria-pressed={mode === m} onClick={() => apply(m)} className={cn('grid size-8 place-items-center rounded-full transition-colors', mode === m ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg')}>
          <I className="size-4" strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}
