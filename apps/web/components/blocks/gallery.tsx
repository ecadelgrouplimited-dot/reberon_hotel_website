'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { MediaRef } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { cn } from '@/lib/cn';
import { Lightbox } from './lightbox';

function Tile({ m, onClick, className, sizes }: { m: MediaRef; onClick: () => void; className?: string; sizes: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('zoom-on-hover group relative block w-full overflow-hidden rounded-[var(--r-md)] focus-visible:outline-offset-4', className)} style={{ backgroundColor: m.dominantColor ?? undefined }} aria-label={`Open photo: ${t(m.alt)}`}>
      <Image src={m.url} alt={t(m.alt)} fill sizes={sizes} className="object-cover" style={{ objectPosition: `${m.focalX * 100}% ${m.focalY * 100}%` }} placeholder={m.lqip ? 'blur' : 'empty'} blurDataURL={m.lqip ?? undefined} />
      <span className="absolute inset-0 bg-basalt-950/0 transition-colors duration-500 group-hover:bg-basalt-950/10" />
    </button>
  );
}

export function GalleryGrid({ items, variant = 'masonry' }: { items: MediaRef[]; variant?: string }) {
  return (
    <Lightbox items={items}>
      {(open) =>
        variant === 'filmstrip' ? (
          <Filmstrip items={items} open={open} />
        ) : variant === 'mosaic' ? (
          <div className="grid auto-rows-[14rem] grid-cols-2 gap-3 md:auto-rows-[18rem] md:grid-cols-4">
            {items.map((m, i) => (
              <Tile key={m.id} m={m} onClick={() => open(i)} className={cn('h-full', i % 5 === 0 && 'col-span-2 row-span-2')} sizes="(min-width:768px) 50vw, 100vw" />
            ))}
          </div>
        ) : (
          <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3">
            {items.map((m, i) => (
              <div key={m.id} className="break-inside-avoid" data-reveal="fade" style={{ ['--i' as string]: i % 3 }}>
                <Tile m={m} onClick={() => open(i)} className={i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'} sizes="(min-width:768px) 33vw, 50vw" />
              </div>
            ))}
          </div>
        )
      }
    </Lightbox>
  );
}

/** Horizontal strip with visible controls: arrows, a count, and edge fades that say "there is more". */
function Filmstrip({ items, open }: { items: MediaRef[]; open: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ start: true, end: false, index: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const first = el.children[0] as HTMLElement | undefined;
      const step = first ? first.offsetWidth + 16 : el.clientWidth;
      setState({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8, index: Math.min(items.length - 1, Math.round(el.scrollLeft / step)) });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items.length]);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const btn = 'grid size-11 place-items-center rounded-full border border-line-strong bg-surface text-fg transition-opacity hover:bg-surface-2 disabled:opacity-30';
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={`${items.length} photos`}>
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
        className="snap-x-strip -mx-[clamp(1rem,4vw,2.5rem)] flex gap-4 overflow-x-auto px-[clamp(1rem,4vw,2.5rem)] pb-2 outline-none"
      >
        {items.map((m, i) => (
          <div key={m.id} className="relative w-[78vw] shrink-0 sm:w-[46vw] lg:w-[34vw]" aria-label={`${i + 1} of ${items.length}`}>
            <Tile m={m} onClick={() => open(i)} className="aspect-[4/5]" sizes="(min-width:1024px) 34vw, 78vw" />
            <p className="mt-3 text-sm text-fg-subtle">{t(m.caption) || t(m.alt)}</p>
          </div>
        ))}
      </div>
      <div className={cn('pointer-events-none absolute inset-y-0 -right-[clamp(1rem,4vw,2.5rem)] w-24 bg-gradient-to-l from-bg to-transparent transition-opacity [.tone-warm_&]:from-bg-warm', state.end && 'opacity-0')} aria-hidden />
      {items.length > 1 && (
        <div className="mt-6 flex items-center gap-4">
          <button type="button" className={btn} onClick={() => go(-1)} disabled={state.start} aria-label="Previous photos"><ArrowLeft className="size-4" /></button>
          <button type="button" className={btn} onClick={() => go(1)} disabled={state.end} aria-label="More photos"><ArrowRight className="size-4" /></button>
          <div className="h-px flex-1 bg-line">
            <div className="h-px bg-fg transition-all duration-500" style={{ width: `${((state.end ? items.length : state.index + 1) / items.length) * 100}%` }} />
          </div>
          <span className="text-sm tabular text-fg-subtle">{String(state.end ? items.length : state.index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
}
