import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ViewTransition } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import type { AmenityCategory } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { api, orNull } from '@/lib/api';
import { buildMetadata, JsonLd, WEB_URL } from '@/lib/seo';
import { MediaImage } from '@/components/ui/media-image';
import { RichText } from '@/components/ui/rich-text';
import { Icon } from '@/components/ui/icon';
import { Contour } from '@/components/ui/contour';
import { Price, CurrencyToggle } from '@/components/site/price';
import { RoomActions } from '@/components/site/room-actions';
import { RoomCard, RoomFacts } from '@/components/blocks/content';
import { GalleryGrid } from '@/components/blocks/gallery';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const rooms = await api.roomTypes().catch(() => []);
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [site, room] = await Promise.all([api.site(), orNull(api.roomType(slug))]);
  if (!room) return {};
  return buildMetadata(site, { title: room.name, seo: room.seo, path: `/rooms/${slug}`, image: room.hero, description: t(room.tagline) });
}

const CATEGORY: Record<AmenityCategory, string> = { VIEW: 'The view', COMFORT: 'Comfort', BATH: 'Bathroom', TECH: 'Power & connection', ACCESS: 'Access' };

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const [site, room] = await Promise.all([api.site(), orNull(api.roomType(slug))]);
  if (!room) notFound();
  const name = t(room.name);
  const groups = Object.entries(
    room.amenities.reduce<Record<string, typeof room.amenities>>((acc, a) => ((acc[a.category] ??= []).push(a), acc), {}),
  );
  const [second, third] = room.gallery.filter((g) => g.id !== room.hero?.id);

  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HotelRoom',
          name,
          description: t(room.tagline),
          url: `${WEB_URL}/rooms/${slug}`,
          occupancy: { '@type': 'QuantitativeValue', maxValue: room.sleepsAdults + room.sleepsChildren },
          bed: t(room.bedConfig),
          floorSize: room.sizeSqm ? { '@type': 'QuantitativeValue', value: room.sizeSqm, unitCode: 'MTK' } : undefined,
          amenityFeature: room.amenities.map((a) => ({ '@type': 'LocationFeatureSpecification', name: t(a.name), value: true })),
          containedInPlace: { '@type': 'Hotel', name: site.name },
        }}
      />
      <div className="container-x pt-24 md:pt-28">
        <Link href="/rooms" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All rooms
        </Link>
        <div className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr] md:grid-rows-2 md:h-[min(72vh,44rem)]">
          <ViewTransition name={`room-${slug}`}>
            <MediaImage media={room.hero} priority sizes="(min-width:768px) 66vw, 100vw" className="aspect-[4/3] rounded-[var(--r-lg)] md:row-span-2 md:aspect-auto md:h-full" badge />
          </ViewTransition>
          {second && <MediaImage media={second} sizes="33vw" className="hidden rounded-[var(--r-lg)] md:block md:h-full" />}
          {third && <MediaImage media={third} sizes="33vw" className="hidden rounded-[var(--r-lg)] md:block md:h-full" />}
        </div>
      </div>

      <div className="container-x grid gap-14 py-14 lg:grid-cols-[1fr_24rem] lg:gap-20 lg:py-20">
        <div>
          <p className="eyebrow">Room · {room.roomCount} of this kind</p>
          <h1 className="mt-4 text-step-5">{name}</h1>
          <p className="mt-5 max-w-2xl text-step-1 leading-relaxed text-fg-muted">{t(room.tagline)}</p>
          <RoomFacts room={room} className="mt-8 border-y border-line py-5 text-base" />
          <RichText value={room.description} className="mt-10 max-w-2xl" />

          <section className="mt-16" aria-labelledby="amen">
            <h2 id="amen" className="text-step-3">In the room</h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-2">
              {groups.map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="eyebrow mb-4">{CATEGORY[cat as AmenityCategory]}</h3>
                  <ul className="space-y-3">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 text-fg-muted">
                        <Icon name={a.icon} className="size-5 text-brand" />
                        {t(a.name)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[var(--r-xl)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <Price price={room.fromPrice} className="text-lg" />
              <CurrencyToggle />
            </div>
            <p className="mt-2 text-xs text-fg-subtle">Starting figure. The price you see at booking includes taxes.</p>
            <div className="mt-6">
              <RoomActions slug={slug} name={name} />
            </div>
            <p className="mt-6 flex items-center gap-2 border-t border-line pt-5 text-sm text-fg-muted">
              <Clock className="size-4" aria-hidden /> Check-in {site.checkInTime} · Check-out {site.checkOutTime}
            </p>
          </div>
        </aside>
      </div>

      {room.gallery.length > 3 && (
        <section className="section-y tone-warm">
          <div className="container-x">
            <h2 className="mb-10 text-step-3">Around the {name}</h2>
            <GalleryGrid items={room.gallery} variant="masonry" />
          </div>
        </section>
      )}

      {room.related.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <Contour className="mb-12 h-16" lines={4} seed={5} />
            <h2 className="mb-12 text-step-4">Other rooms</h2>
            <div className="grid gap-10 md:grid-cols-3">
              {room.related.map((r, i) => (
                <RoomCard key={r.id} room={r} i={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
