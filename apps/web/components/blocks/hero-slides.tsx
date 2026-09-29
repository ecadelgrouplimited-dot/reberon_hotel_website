'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Slow crossfade between hero images. Stops for reduced motion and hidden tabs. */
export function HeroSlides({ slides, interval = 7000 }: { slides: ReactNode[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!document.hidden) setI((x) => (x + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [slides.length, interval]);
  return (
    <>
      {slides.map((s, k) => (
        <div key={k} className={cn('absolute inset-0 transition-opacity duration-[2400ms] ease-in-out', k === i ? 'opacity-100' : 'opacity-0')} aria-hidden={k !== i}>
          {s}
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-8 right-[clamp(1rem,4vw,2.5rem)] z-20 hidden gap-1.5 md:flex" aria-hidden>
          {slides.map((_, k) => (
            <span key={k} className={cn('h-0.5 w-8 overflow-hidden rounded-full bg-white/30')}>
              <span className={cn('block h-full bg-white', k === i ? 'w-full transition-[width] ease-linear' : 'w-0')} style={{ transitionDuration: k === i ? `${interval}ms` : '0ms' }} />
            </span>
          ))}
        </div>
      )}
    </>
  );
}
