'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Rotate3d } from 'lucide-react';
import type { LText, TourDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { SectionHeading } from '@/components/ui/section-heading';
import { TourPlayer } from '@/components/tours/tour-player';
import { cn } from '@/lib/cn';
import type { BlockProps } from './types';

/** A space to walk. For the hall: the same room cleared and set for forty. */
export function TourEmbed({ block }: BlockProps<{ eyebrow?: LText; heading?: LText; intro?: LText }, { tours: TourDTO[] }>) {
  const tours = block.resolved?.tours ?? [];
  const [i, setI] = useState(0);
  const tour = tours[i];
  if (!tour) return null;
  return (
    <div className="container-x">
      <SectionHeading eyebrow={block.data.eyebrow} heading={block.data.heading} intro={block.data.intro} className="mb-10" />
      {tours.length > 1 && (
        <div className="mb-5 inline-flex rounded-full border border-line p-1" role="tablist" aria-label="Version">
          {tours.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={cn('rounded-full px-5 py-2 text-sm font-medium transition', k === i ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg')}>
              {x.variant === 'EMPTY' ? 'Cleared' : x.variant === 'SET' ? 'Set for an event' : t(x.title)}
            </button>
          ))}
        </div>
      )}
      <TourPlayer tour={tour} context="PAGE">
        {(open) => (
          <button type="button" onClick={open} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-[var(--r-xl)] bg-basalt-950 text-left text-mist-50" data-reveal>
            {tour.poster && <Image key={tour.poster.id} src={tour.poster.url} alt="" fill sizes="(min-width:1280px) 1200px, 100vw" className="object-cover opacity-80 transition duration-1000 group-hover:scale-105 group-hover:opacity-60" placeholder={tour.poster.lqip ? 'blur' : 'empty'} blurDataURL={tour.poster.lqip ?? undefined} />}
            <span className="absolute inset-0 bg-gradient-to-t from-basalt-950/80 via-transparent" aria-hidden />
            <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-10">
              <span>
                <span className="block font-display text-step-3">{t(tour.title)}</span>
                {t(tour.summary) && <span className="mt-2 block max-w-xl text-mist-50/80">{t(tour.summary)}</span>}
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 font-medium backdrop-blur transition group-hover:bg-white/25"><Rotate3d className="size-5" aria-hidden /> Walk it</span>
            </span>
          </button>
        )}
      </TourPlayer>
    </div>
  );
}
