import type { LText } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { cn } from '@/lib/cn';

export function SectionHeading({
  eyebrow, heading, intro, align = 'left', className, as: Tag = 'h2', size = 'lg',
}: { eyebrow?: LText; heading?: LText; intro?: LText; align?: 'left' | 'center'; className?: string; as?: 'h1' | 'h2'; size?: 'md' | 'lg' }) {
  if (!t(eyebrow) && !t(heading) && !t(intro)) return null;
  return (
    <header className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      {t(eyebrow) && <p className="eyebrow mb-4" data-reveal>{t(eyebrow)}</p>}
      {t(heading) && (
        <Tag className={cn(size === 'lg' ? 'text-step-4' : 'text-step-3', 'text-fg')} data-reveal style={{ ['--i' as string]: 1 }}>
          {t(heading)}
        </Tag>
      )}
      {t(intro) && <p className="mt-5 text-step-1 leading-relaxed text-fg-muted" data-reveal style={{ ['--i' as string]: 2 }}>{t(intro)}</p>}
    </header>
  );
}
