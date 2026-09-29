import { cn } from '@/lib/cn';

/** Split a headline into masked words that rise in on load (CSS only). */
export function Words({ text, className, as: Tag = 'span', offset = 0 }: { text: string; className?: string; as?: 'span' | 'h1' | 'h2'; offset?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={cn('words', className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="w" aria-hidden>
          <span style={{ ['--i' as string]: i + offset }}>{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
