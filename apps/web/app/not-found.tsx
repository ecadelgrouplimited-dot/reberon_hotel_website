import Link from 'next/link';
import { api, orNull } from '@/lib/api';
import { Blocks } from '@/components/blocks';

/** The 404 is a CMS page too; a plain fallback covers an unreachable API. */
export default async function NotFound() {
  const [site, page] = await Promise.all([orNull(api.site()), orNull(api.page('404'))]).catch(() => [null, null] as const);
  if (site && page) return <Blocks page={page} site={site} />;
  return (
    <section className="container-x grid min-h-[70vh] place-items-center pt-24 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-step-5">This path leads into the mist.</h1>
        <Link href="/" className="btn mt-8">Go home</Link>
      </div>
    </section>
  );
}
