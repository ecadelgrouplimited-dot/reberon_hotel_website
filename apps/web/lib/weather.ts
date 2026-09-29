import 'server-only';

export interface DayForecast {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number | null;
  sunrise: string; // HH:MM Kampala
  sunset: string;
}

export interface Weather {
  now: { temp: number; code: number; wind: number; humidity: number; isDay: boolean; at: string } | null;
  kampalaTemp: number | null;
  days: DayForecast[];
  elevation: number | null;
  source: 'live' | 'computed';
}

/** WMO weather codes in plain words, as a guest would say them. */
export function describe(code: number): { label: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'storm' } {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code <= 2) return { label: code === 1 ? 'Mostly clear' : 'Partly cloudy', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code <= 48) return { label: 'Mist on the mountain', icon: 'fog' };
  if (code <= 57) return { label: 'Drizzle', icon: 'drizzle' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: code >= 80 ? 'Showers' : 'Rain', icon: 'rain' };
  if (code >= 95) return { label: 'Thunderstorms', icon: 'storm' };
  return { label: 'Changeable', icon: 'cloud' };
}

/**
 * Sunrise/sunset from the sun's position (NOAA approximation). Used when the
 * weather service is unreachable, so the strip never breaks.
 */
function solarTimes(date: Date, lat: number, lng: number, tzHours = 3) {
  const rad = Math.PI / 180;
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const fmt = (min: number) => {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  return { sunrise: fmt(720 - 4 * (lng + ha) - eqTime + tzHours * 60), sunset: fmt(720 - 4 * (lng - ha) - eqTime + tzHours * 60) };
}

const KAMPALA = { lat: 0.3476, lng: 32.5825 };

export async function getWeather(lat: number, lng: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat},${KAMPALA.lat}&longitude=${lng},${KAMPALA.lng}` +
    '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day' +
    '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' +
    '&timezone=Africa%2FKampala&forecast_days=4';
  try {
    const res = await fetch(url, { next: { revalidate: 1800, tags: ['weather'] }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(String(res.status));
    const [here, kampala] = (await res.json()) as {
      elevation: number;
      current: { time: string; temperature_2m: number; weather_code: number; wind_speed_10m: number; relative_humidity_2m: number; is_day: number };
      daily: { time: string[]; sunrise: string[]; sunset: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; weather_code: number[] };
    }[];
    const d = here!.daily;
    return {
      now: { temp: here!.current.temperature_2m, code: here!.current.weather_code, wind: here!.current.wind_speed_10m, humidity: here!.current.relative_humidity_2m, isDay: here!.current.is_day === 1, at: here!.current.time },
      kampalaTemp: kampala?.current.temperature_2m ?? null,
      elevation: here!.elevation,
      source: 'live',
      days: d.time.map((date, i) => ({
        date,
        code: d.weather_code[i]!,
        max: Math.round(d.temperature_2m_max[i]!),
        min: Math.round(d.temperature_2m_min[i]!),
        rain: d.precipitation_probability_max[i] ?? null,
        sunrise: d.sunrise[i]!.slice(11, 16),
        sunset: d.sunset[i]!.slice(11, 16),
      })),
    };
  } catch {
    const today = new Date();
    const days = Array.from({ length: 4 }, (_, i) => {
      const dt = new Date(today.getTime() + i * 86_400_000);
      return { date: dt.toISOString().slice(0, 10), code: -1, max: NaN, min: NaN, rain: null, ...solarTimes(dt, lat, lng) };
    });
    return { now: null, kampalaTemp: null, days, elevation: null, source: 'computed' };
  }
}
