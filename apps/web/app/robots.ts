import type { MetadataRoute } from 'next';
import { WEB_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // Anything that is not production is kept out of search engines.
  if (process.env.SITE_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/'] }, sitemap: `${WEB_URL}/sitemap.xml` };
}
