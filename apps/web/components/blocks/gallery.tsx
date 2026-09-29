'use client';
import Image from 'next/image';
import type { MediaRef } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { cn } from '@/lib/cn';
import { Lightbox } from './lightbox';

function Tile({ m, onClick, className, sizes }: { m: MediaRef; onClick: () => void; className?: string; sizes: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('zoom-on-hover group relative block w-full overflow-hidden rounded-[var(--radius-md)] focus-visible:outline-offset-4', className)} style={{ backgroundColor: m.dominantColor ?? undefined }} aria-label={`Open photo: ${t(m.alt)}`}>
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
          <div className="snap-x-strip -mx-[clamp(1rem,4vw,2.5rem)] flex gap-4 overflow-x-auto px-[clamp(1rem,4vw,2.5rem)] pb-2">
            {items.map((m, i) => (
              <div key={m.id} className="relative w-[78vw] shrink-0 sm:w-[46vw] lg:w-[34vw]" data-reveal="fade" style={{ ['--i' as string]: i % 4 }}>
                <Tile m={m} onClick={() => open(i)} className="aspect-[4/5]" sizes="(min-width:1024px) 34vw, 78vw" />
                <p className="mt-3 text-sm text-fg-subtle">{t(m.caption) || t(m.alt)}</p>
              </div>
            ))}
          </div>
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
