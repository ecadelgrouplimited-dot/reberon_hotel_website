import Image from 'next/image';
import type { MediaRef } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { cn } from '@/lib/cn';

interface Props {
  media: MediaRef | null | undefined;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Show "Drawing" badge for renders/placeholders (honesty rule). */
  badge?: boolean;
  alt?: string;
  fill?: boolean;
}

/** next/image over the API's pre-generated webp widths, with LQIP and focal point. */
export function MediaImage({ media, sizes, priority, className, imgClassName, badge = false, alt, fill = true }: Props) {
  const positioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? '');
  if (!media) return <div className={cn(!positioned && 'relative', 'bg-surface-2', className)} aria-hidden />;
  const style = { objectPosition: `${media.focalX * 100}% ${media.focalY * 100}%`, backgroundColor: media.dominantColor ?? undefined } as const;
  return (
    <div className={cn(!positioned && 'relative', 'overflow-hidden', className)} style={{ backgroundColor: media.dominantColor ?? undefined }}>
      <Image
        src={media.url}
        alt={alt ?? t(media.alt)}
        sizes={sizes}
        priority={priority}
        fetchPriority={priority ? 'high' : undefined}
        {...(fill ? { fill: true } : { width: media.width ?? 1600, height: media.height ?? 1067 })}
        placeholder={media.lqip ? 'blur' : 'empty'}
        blurDataURL={media.lqip ?? undefined}
        className={cn('object-cover', imgClassName)}
        style={style}
      />
      {badge && media.isRendering && <RenderingBadge />}
    </div>
  );
}

export function RenderingBadge({ className }: { className?: string }) {
  return (
    <span className={cn('absolute right-3 top-3 z-10 rounded-full bg-basalt-950/70 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-mist-50 backdrop-blur-md', className)}>
      Drawing · not a photo
    </span>
  );
}
