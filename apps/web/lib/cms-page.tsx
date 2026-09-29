import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { api, orNull } from '@/lib/api';
import { buildMetadata } from '@/lib/seo';
import { Blocks } from '@/components/blocks';

/** Any page composed in the House: fetch by slug, render its blocks. */
export async function cmsMetadata(slug: string): Promise<Metadata> {
  const [site, page] = await Promise.all([api.site(), orNull(api.page(slug))]);
  if (!page) return {};
  const hero = page.blocks.find((b) => b.type === 'hero')?.data.media as string[] | undefined;
  return buildMetadata(site, { title: page.title, seo: page.seo, path: `/${slug}`, media: page.media, image: hero?.[0] ? page.media[hero[0]] : null });
}

export async function CmsPage({ slug }: { slug: string }) {
  const [site, page] = await Promise.all([api.site(), orNull(api.page(slug))]);
  if (!page) notFound();
  return <Blocks page={page} site={site} ctx={{ pagePath: `/${slug}` }} />;
}
