import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { t } from '@reberon/contracts';
import { api, orNull } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { dateLong } from '@/lib/format';
import { RichText } from '@/components/ui/rich-text';
import { GalleryGrid } from '@/components/blocks/gallery';
import { ProgressRing } from '@/components/blocks/place';

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const res = await api.progress(undefined, 50).catch(() => null);
  return (res?.data ?? []).map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [site, u] = await Promise.all([api.site(), orNull(api.progressOne(slug))]);
  if (!u) return {};
  return buildMetadata(site, { title: u.title, path: `/rising/${slug}`, image: u.media[0], description: `Construction update from ${dateLong(u.happenedOn)}.` });
}

export default async function ProgressPage({ params }: Props) {
  const { slug } = await params;
  const u = await orNull(api.progressOne(slug));
  if (!u) notFound();
  return (
    <article className="pt-28 md:pt-36">
      <div className="container-x max-w-4xl">
        <Link href="/rising" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Watch the hotel rise
        </Link>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-8">
          <div>
            <time dateTime={u.happenedOn} className="eyebrow">{dateLong(u.happenedOn)}</time>
            <h1 className="mt-4 text-step-5">{t(u.title)}</h1>
          </div>
          {u.percentComplete !== null && <ProgressRing percent={u.percentComplete} size={132} />}
        </div>
        <RichText value={u.body} className="mt-10 text-[1.12rem]" />
      </div>
      {u.media.length > 0 && (
        <div className="container-x section-y">
          <GalleryGrid items={u.media} variant="mosaic" />
        </div>
      )}
      <nav className="container-x grid gap-4 pb-24 sm:grid-cols-2" aria-label="More updates">
        {u.older ? (
          <Link href={`/rising/${u.older.slug}`} className="group rounded-[var(--radius-lg)] border border-line p-6 hover:border-line-strong">
            <span className="text-sm text-fg-subtle">← Earlier</span>
            <span className="mt-2 block text-step-1 font-medium group-hover:text-accent">{t(u.older.title)}</span>
          </Link>
        ) : <span />}
        {u.newer && (
          <Link href={`/rising/${u.newer.slug}`} className="group rounded-[var(--radius-lg)] border border-line p-6 text-right hover:border-line-strong">
            <span className="inline-flex items-center gap-1 text-sm text-fg-subtle">Later <ArrowRight className="size-3.5" /></span>
            <span className="mt-2 block text-step-1 font-medium group-hover:text-accent">{t(u.newer.title)}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
