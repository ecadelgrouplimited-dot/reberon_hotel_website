'use client';
import { useEffect, useState } from 'react';
import { Moon, Sunrise, Sunset } from 'lucide-react';
import { cn } from '@/lib/cn';

const TZ = 'Africa/Kampala';
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
function kampalaNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  return h * 60 + m;
}
const dur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`);

/** Ticking local clock (Kapchorwa keeps East Africa Time, like Kampala). */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const d = now ?? new Date();
  return (
    <span className={className}>
      <time className="block font-display text-[clamp(2.6rem,6vw,4rem)] leading-none tabular" suppressHydrationWarning>
        {new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(' ', ' ')}
      </time>
      <span className="mt-2 block text-sm opacity-70" suppressHydrationWarning>
        {new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(d)}
      </span>
    </span>
  );
}

/** The day as an arc from sunrise to sunset, with the sun where it is now. */
export function SunArc({ sunrise, sunset, tomorrowSunrise, className }: { sunrise: string; sunset: string; tomorrowSunrise: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(kampalaNow());
    const id = setInterval(() => setNow(kampalaNow()), 60_000);
    return () => clearInterval(id);
  }, []);
  const rise = toMin(sunrise);
  const set = toMin(sunset);
  const day = now !== null && now >= rise && now <= set;
  const f = now === null ? 0.5 : Math.min(1, Math.max(0, (now - rise) / (set - rise)));
  const W = 300;
  const R = 130;
  const cx = W / 2;
  const cy = 150;
  const angle = Math.PI * (1 - f);
  const sx = cx + R * Math.cos(angle);
  const sy = cy - R * Math.sin(angle);
  const toGolden = set - 50 - (now ?? 0);
  const untilRise = now === null ? 0 : now > set ? 1440 - now + toMin(tomorrowSunrise) : rise - now;
  let note = '';
  if (now !== null) {
    if (!day) note = `Sunrise in ${dur(untilRise)}`;
    else if (toGolden > 0 && toGolden < 180) note = `Golden light on the escarpment in ${dur(toGolden)}`;
    else if (toGolden <= 0) note = `Sunset in ${dur(set - now)}`;
    else note = `${dur(set - now)} of daylight left`;
  }
  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${W} 170`} className="w-full" aria-hidden>
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor="#e0a54b" stopOpacity=".35" />
            <stop offset=".5" stopColor="#f3d9b1" stopOpacity=".9" />
            <stop offset="1" stopColor="#c9484a" stopOpacity=".45" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#f3d9b1" stopOpacity=".9" />
            <stop offset="1" stopColor="#f3d9b1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="1" strokeDasharray="3 5" />
        {now !== null && day && <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${sx} ${sy}`} fill="none" stroke="url(#arc)" strokeWidth="2.5" strokeLinecap="round" />}
        <line x1="8" x2={W - 8} y1={cy} y2={cy} stroke="currentColor" strokeOpacity=".25" />
        {now !== null && day && (
          <>
            <circle cx={sx} cy={sy} r="26" fill="url(#glow)" />
            <circle cx={sx} cy={sy} r="8" fill="#f3d9b1" />
          </>
        )}
      </svg>
      {now !== null && !day && <Moon className="absolute left-1/2 top-[38%] size-7 -translate-x-1/2 opacity-80" strokeWidth={1.4} />}
      <div className="mt-1 flex justify-between text-sm tabular">
        <span className="flex items-center gap-1.5"><Sunrise className="size-4 opacity-70" strokeWidth={1.5} />{sunrise}</span>
        <span className="flex items-center gap-1.5">{sunset}<Sunset className="size-4 opacity-70" strokeWidth={1.5} /></span>
      </div>
      <p className="mt-2 min-h-5 text-center text-sm opacity-80" aria-live="polite">{note}</p>
    </div>
  );
}
