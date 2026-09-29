import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Sun, Wind } from 'lucide-react';
import type { LText } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { getWeather, describe } from '@/lib/weather';
import { SectionHeading } from '@/components/ui/section-heading';
import { Contour } from '@/components/ui/contour';
import { cn } from '@/lib/cn';
import { LiveClock, SunArc } from './now-live';
import type { BlockProps } from './types';

const ICON = { sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, storm: CloudLightning } as const;

type Data = { eyebrow?: LText; heading?: LText; intro?: LText; showForecast?: boolean; compareKampala?: boolean };

export async function NowStrip({ block, site }: BlockProps<Data>) {
  const geo = site.contact.geo ?? { lat: 1.396, lng: 34.45 };
  const w = await getWeather(geo.lat, geo.lng);
  const today = w.days[0]!;
  const d = block.data;
  const card = block.variant === 'card';
  const cond = w.now ? describe(w.now.code) : null;
  const Icon = cond ? ICON[cond.icon] : null;
  const diff = w.now && w.kampalaTemp !== null ? Math.round(w.kampalaTemp - w.now.temp) : null;

  return (
    <div className={cn(!card && 'tone-dark relative overflow-hidden')}>
      {!card && <Contour className="absolute inset-x-0 top-0 h-24 opacity-40" lines={6} seed={9} />}
      <div className={cn('container-x relative', card ? 'py-[clamp(3rem,7vw,6rem)]' : 'py-[clamp(4rem,9vw,7rem)]')}>
        <div className={cn(card && 'tone-moss rounded-[var(--r-xl)] p-[clamp(1.5rem,4vw,3rem)]')}>
          <SectionHeading eyebrow={d.eyebrow ?? { en: 'Kapchorwa, right now' }} heading={d.heading} intro={d.intro} size="md" className="mb-12" />
          <div className="grid items-end gap-12 md:grid-cols-[1fr_1fr_1.1fr]">
            <div data-reveal>
              <LiveClock />
              <p className="mt-6 text-sm opacity-70">
                {w.elevation ? `${w.elevation.toLocaleString('en')} m above the sea` : '1,900 m above the sea'} · East Africa Time
              </p>
            </div>

            <div data-reveal style={{ ['--i' as string]: 1 }}>
              {w.now && cond && Icon ? (
                <>
                  <p className="flex items-start gap-4">
                    <span className="font-display text-[clamp(3.4rem,8vw,5.2rem)] leading-[0.85] tabular">{Math.round(w.now.temp)}°</span>
                    <Icon className="mt-2 size-10 opacity-85" strokeWidth={1.2} aria-hidden />
                  </p>
                  <p className="mt-3 text-lg">{cond.label}</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
                    <span className="flex items-center gap-1"><Droplets className="size-3.5" aria-hidden /> {w.now.humidity}% humidity</span>
                    <span className="flex items-center gap-1"><Wind className="size-3.5" aria-hidden /> {Math.round(w.now.wind)} km/h</span>
                  </p>
                  {d.compareKampala !== false && diff !== null && diff > 0 && (
                    <p className="mt-4 inline-flex rounded-full border border-current/20 px-3 py-1 text-sm">{diff}° cooler than Kampala right now</p>
                  )}
                </>
              ) : (
                <p className="text-lg opacity-80">Weather is on its way. Highland days are warm and nights are cool; bring a jumper.</p>
              )}
            </div>

            <div data-reveal style={{ ['--i' as string]: 2 }}>
              <SunArc sunrise={today.sunrise} sunset={today.sunset} tomorrowSunrise={w.days[1]?.sunrise ?? today.sunrise} />
            </div>
          </div>

          {d.showForecast !== false && w.source === 'live' && (
            <ol className="mt-12 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--r-lg)] border border-line bg-line">
              {w.days.slice(1, 4).map((day, i) => {
                const c = describe(day.code);
                const DI = ICON[c.icon];
                return (
                  <li key={day.date} className="bg-[var(--bg)] p-4 sm:p-5" data-reveal="fade" style={{ ['--i' as string]: i }}>
                    <p className="text-sm opacity-70">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</p>
                    <p className="mt-3 flex items-center gap-2">
                      <DI className="size-6 opacity-80" strokeWidth={1.3} aria-hidden />
                      <span className="font-display text-2xl tabular">{day.max}°</span>
                      <span className="text-sm tabular opacity-60">{day.min}°</span>
                    </p>
                    <p className="mt-1 text-sm opacity-70">{c.label}{day.rain !== null ? ` · ${day.rain}% rain` : ''}</p>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-6 text-xs opacity-50">
            {w.source === 'live' ? `Live from Open-Meteo, refreshed every 30 minutes${w.now ? ` · updated ${w.now.at.slice(11, 16)}` : ''}.` : 'Sunrise and sunset calculated for the hotel’s position.'}
          </p>
        </div>
      </div>
    </div>
  );
}
