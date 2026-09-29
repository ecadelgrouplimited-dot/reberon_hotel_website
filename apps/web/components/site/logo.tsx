import Image from 'next/image';
import type { SiteDTO } from '@reberon/contracts';
import { cn } from '@/lib/cn';

/** Wordmark with a ridge glyph; replaced by the uploaded logo when one is set. */
export function Logo({ site, className }: { site: Pick<SiteDTO, 'name' | 'logo'>; className?: string }) {
  if (site.logo) {
    return <Image src={site.logo.url} alt={site.name} width={160} height={48} className={cn('h-9 w-auto', className)} priority />;
  }
  const [first, ...rest] = site.name.split(' ');
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 24" className="h-5 w-9 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
        <path d="M1 22 L11 9 L16 14 L24 3 L39 22" />
        <path d="M6 22 L13 15.5" opacity=".5" />
        <circle cx="30" cy="6" r="2.2" fill="var(--color-gold-400)" stroke="none" />
      </svg>
      <span className="font-display text-[1.35rem] leading-none tracking-[-0.01em]" style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 36" }}>
        {first}
        {rest.length > 0 && <span className="ml-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.28em] opacity-70">{rest.join(' ')}</span>}
      </span>
    </span>
  );
}
