import { cn } from '@/lib/cn';

/** Topographic hairlines, drawn as the section scrolls into view. */
export function Contour({ className, lines = 7, seed = 1 }: { className?: string; lines?: number; seed?: number }) {
  const paths = Array.from({ length: lines }, (_, i) => {
    const y = 20 + i * 12;
    const a = 6 + ((seed * 7 + i * 3) % 9);
    const p = (seed + i) * 0.9;
    let d = `M0 ${y}`;
    for (let x = 0; x <= 1200; x += 40) d += ` L${x} ${(y + Math.sin(x / 140 + p) * a + Math.sin(x / 55 + p * 2) * (a / 3)).toFixed(1)}`;
    return d;
  });
  return (
    <svg data-reveal-contour className={cn('contour-draw pointer-events-none w-full text-line-strong', className)} viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" style={{ ['--i' as string]: i }} />
      ))}
    </svg>
  );
}
