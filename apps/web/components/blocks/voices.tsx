import type { LText } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';
import type { BlockProps } from './types';

type Voice = { id: string; author: string; origin: string | null; text: LText; rating: number | null };

const place = (code: string | null) => {
  if (!code) return null;
  if (code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

/** Guests' own words, only from those who agreed to be quoted. Hidden when there are none yet. */
export function Voices({ block }: BlockProps<{ eyebrow?: LText; heading?: LText; intro?: LText }, { voices: Voice[] }>) {
  const voices = block.resolved?.voices ?? [];
  if (!voices.length) return null;
  const [lead, ...rest] = voices;
  return (
    <div className="container-x">
      <SectionHeading eyebrow={block.data.eyebrow} heading={block.data.heading} intro={block.data.intro} className="mb-12" />
      <div className="grid gap-5 lg:grid-cols-12">
        <figure className="relative flex flex-col justify-between overflow-hidden rounded-[var(--r-xl)] bg-basalt-950 p-8 text-mist-50 sm:p-12 lg:col-span-7 lg:row-span-2" data-reveal>
          <span aria-hidden className="pointer-events-none absolute -top-10 left-4 font-display text-[14rem] leading-none text-gold-400/25">“</span>
          <blockquote className="relative font-display text-step-2 leading-[1.25]" style={{ fontStyle: 'italic', fontWeight: 330 }}>{t(lead!.text)}</blockquote>
          <figcaption className="relative mt-10 text-sm uppercase tracking-[0.2em] text-mist-50/75">
            {lead!.author}
            {place(lead!.origin) && <span className="text-gold-400"> · {place(lead!.origin)}</span>}
          </figcaption>
        </figure>
        {rest.map((v, i) => (
          <figure key={v.id} className={cn('flex flex-col justify-between rounded-[var(--r-lg)] border border-line p-7', 'lg:col-span-5')} data-reveal style={{ ['--i' as string]: i + 1 }}>
            <blockquote className="font-display text-step-0 leading-relaxed" style={{ fontStyle: 'italic' }}>“{t(v.text)}”</blockquote>
            <figcaption className="mt-6 text-[0.8rem] uppercase tracking-[0.18em] text-fg-muted">
              {v.author}
              {place(v.origin) && <> · {place(v.origin)}</>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
