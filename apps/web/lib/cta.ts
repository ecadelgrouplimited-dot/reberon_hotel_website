import type { Cta, SiteDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { whatsappLink } from '@reberon/utils';

export interface CtaContext {
  pagePath?: string;
  roomName?: string;
  roomSlug?: string;
}

export function whatsappHref(site: Pick<SiteDTO, 'contact'>, ctx: CtaContext = {}, message?: string) {
  if (!site.contact.whatsapp) return null;
  const text = message ?? (ctx.roomName ? `Hello Reberon Hotel, I would like to ask about the ${ctx.roomName}.` : 'Hello Reberon Hotel, I have a question about a stay.');
  return whatsappLink(site.contact.whatsapp, text);
}

/** Resolve a CMS button into an href (for no-JS) plus the behaviour the client adds. */
export function resolveCta(cta: Cta, site: SiteDTO, ctx: CtaContext = {}) {
  const label = t(cta.label);
  switch (cta.action) {
    case 'whatsapp':
      return { label, href: whatsappHref(site, ctx, cta.prefill) ?? '/contact', external: true, kind: 'whatsapp' as const };
    case 'call':
      return { label, href: `tel:${(site.contact.phones[0] ?? '').replace(/\s/g, '')}`, external: false, kind: 'call' as const };
    case 'enquire':
      return { label, href: '/contact#enquire', external: false, kind: 'enquire' as const };
    case 'waitlist':
      return { label, href: '/first-stay#waitlist', external: false, kind: 'link' as const };
    case 'book':
      return site.features.bookingEnabled
        ? { label, href: '/book', external: false, kind: 'link' as const }
        : { label, href: '/first-stay#waitlist', external: false, kind: 'link' as const };
    default:
      return { label, href: cta.href ?? '/', external: /^https?:/.test(cta.href ?? ''), kind: 'link' as const };
  }
}
