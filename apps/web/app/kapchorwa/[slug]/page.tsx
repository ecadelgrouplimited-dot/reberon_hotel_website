import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import { t } from '@reberon/contracts';
import { api, orNull } from '@/lib/api';
import { buildMetadata, JsonLd, WEB_URL } from '@/lib/seo';
import { driveTime } from '@/lib/format';
import { MediaImage } from '@/components/ui/media-image';
import { RichText } from '@/components/ui/rich-text';
import { Words } from '@/components/ui/words';
import { Blocks } from '@/components/blocks';
import { Journey, DestinationCard } from '@/components/blocks/place';
import { GalleryGrid } from '@/components/blocks/gallery';
import { CtaBand } from '@/components/blocks/closing';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const list = await api.destinations().catch(() => []);
  return list.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [site, d] = await Promise.all([api.site(), orNull(api.destination(slug))]);
  if (!d) return {};
  return buildMetadata(site, { title: d.name, seo: d.seo, path: `/kapchorwa/${slug}`, image: d.hero, description: t(d.tagline) });
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const [site, d] = await Promise.all([api.site(), orNull(api.destination(slug))]);
  if (!d) notFound();
  const name = t(d.name);
  return (
    <article>
      {d.kind === 'PLACE' && (
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'TouristAttraction', name, description: t(d.tagline), url: `${WEB_URL}/kapchorwa/${slug}`, geo: d.lat ? { '@type': 'GeoCoordinates', latitude: d.lat, longitude: d.lng } : undefined }} />
      )}
      <header data-hero-overlay className="grain relative isolate flex min-h-[78svh] items-end overflow-hidden bg-moss-900 text-mist-50">
        <div className="hero-parallax absolute inset-0 -z-10">
          <MediaImage media={d.hero} sizes="100vw" priority className="absolute inset-0" imgClassName="ken-burns" />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(18_21_19/.5),rgb(18_21_19/.1)_40%,rgb(18_21_19/.82))]" />
        <div className="hero-fade container-x pb-16 pt-36 md:pb-24">
          <Link href="/kapchorwa" className="fade-up mb-8 inline-flex items-center gap-2 text-sm text-mist-50/80 hover:text-mist-50" style={{ ['--d' as string]: '0s' }}>
            <ArrowLeft className="size-4" /> Kapchorwa
          </Link>
          <Words as="h1" text={name} className="block text-step-6 leading-[0.98]" />
          <p className="fade-up mt-6 max-w-2xl text-step-1 text-mist-50/85" style={{ ['--d' as string]: '0.7s' }}>{t(d.tagline)}</p>
          {(d.driveMinutes || d.distanceKm) && (
            <p className="fade-up mt-6 flex flex-wrap gap-3 text-sm" style={{ ['--d' as string]: '0.9s' }}>
              {d.driveMinutes && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-md">
                  <Clock className="size-4" aria-hidden /> {driveTime(d.driveMinutes)} {d.kind === 'ROUTE' ? 'on the road' : 'from the hotel'}
                </span>
              )}
              {d.distanceKm && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-md">
                  <MapPin className="size-4" aria-hidden /> {d.distanceKm} km
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="container-x section-y">
        <RichText value={d.body} className="mx-auto max-w-[44rem] text-[1.12rem] [&>p:first-child]:font-display [&>p:first-child]:text-step-2 [&>p:first-child]:leading-snug [&>p:first-child]:text-fg" />
      </div>

      {d.stops.length > 1 && (
        <section className="section-y tone-dark">
          <Journey stops={d.stops} eyebrow={{ en: 'Stop by stop' }} heading={{ en: 'Kampala to Kapchorwa' }} intro={{ en: 'Driving times without stops. Add an hour for lunch in Mbale.' }} />
        </section>
      )}

      {d.blocks.length > 0 && <Blocks page={{ blocks: d.blocks, media: d.media }} site={site} ctx={{ pagePath: `/kapchorwa/${slug}` }} />}

      {d.gallery.length > 0 && (
        <section className="section-y tone-warm">
          <div className="container-x">
            <GalleryGrid items={d.gallery} variant="filmstrip" />
          </div>
        </section>
      )}

      <section className="section-y">
        <div className="container-x">
          <h2 className="mb-10 text-step-4">More of Kapchorwa</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.others.slice(0, 3).map((o, i) => (
              <DestinationCard key={o.id} d={o} i={i} />
            ))}
          </div>
        </div>
      </section>
      <section className="pb-[clamp(4rem,10vw,9rem)]">
        <CtaBand
          block={{ id: 'dest-cta', type: 'ctaBand', data: { heading: { en: 'Stay close to it' }, sub: { en: 'Ten rooms, a kitchen that opens early for walkers, and people who know the road.' }, ctas: [{ label: { en: 'Claim a first stay' }, action: 'waitlist', style: 'primary' }, { label: { en: 'Ask about a guide' }, action: 'enquire', style: 'secondary' }] } }}
          media={{}}
          site={site}
          ctx={{ pagePath: `/kapchorwa/${slug}` }}
          index={0}
        />
      </section>
    </article>
  );
}
