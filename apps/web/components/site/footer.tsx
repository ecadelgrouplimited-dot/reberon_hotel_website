import Link from 'next/link';
import type { SiteDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts';
import { whatsappLink } from '@reberon/utils';
import { Contour } from '@/components/ui/contour';
import { Logo } from './logo';
import { CurrencyToggle } from './price';
import { ThemeToggle } from './theme-toggle';

export function Footer({ site }: { site: SiteDTO }) {
  const year = new Date().getFullYear();
  return (
    <footer className="tone-dark relative overflow-hidden pb-28 pt-20 md:pb-10">
      <Contour className="absolute inset-x-0 top-0 h-28 opacity-60" lines={9} seed={4} />
      <div className="container-x relative">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo site={site} className="text-mist-50" />
            <p className="mt-6 max-w-sm font-display text-step-2 leading-snug text-mist-50/90">{t(site.tagline)}</p>
            <p className="mt-4 text-sm text-fg-muted">{t(site.openingLabel)}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {site.contact.whatsapp && (
                <a className="btn" href={whatsappLink(site.contact.whatsapp, 'Hello Reberon Hotel,')} target="_blank" rel="noopener noreferrer">
                  WhatsApp us
                </a>
              )}
              <Link className="btn btn-secondary" href="/first-stay">
                Claim a first stay
              </Link>
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {site.nav.FOOTER_PRIMARY.map((col) => (
              <nav key={col.id} aria-label={t(col.label)}>
                <p className="eyebrow mb-4">{t(col.label)}</p>
                <ul className="space-y-2.5 text-[0.95rem]">
                  {(col.children.length ? col.children : [col]).map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} className="text-fg-muted transition-colors hover:text-fg">
                        {t(i.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <p className="eyebrow mb-4">Talk to us</p>
              <ul className="space-y-2.5 text-[0.95rem] text-fg-muted">
                {site.contact.phones.map((p) => (
                  <li key={p}>
                    <a href={`tel:${p.replace(/\s/g, '')}`} className="tabular hover:text-fg">
                      {p}
                    </a>
                  </li>
                ))}
                {site.contact.email && (
                  <li>
                    <a href={`mailto:${site.contact.email}`} className="hover:text-fg">
                      {site.contact.email}
                    </a>
                  </li>
                )}
                <li className="pt-2 text-sm leading-relaxed text-fg-subtle">{t(site.contact.address)}</li>
                <li className="text-sm text-fg-subtle">{t(site.contact.hours)}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-line pt-8 text-sm text-fg-subtle md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>© {year} {site.name}</span>
            {site.nav.FOOTER_LEGAL.map((i) => (
              <Link key={i.id} href={i.href} className="hover:text-fg">
                {t(i.label)}
              </Link>
            ))}
            <span>{t(site.footerNote)}</span>
          </div>
          <div className="flex items-center gap-3">
            <CurrencyToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none mt-16 select-none text-center font-display text-[22vw] leading-[0.8] tracking-[-0.04em] text-mist-50/[0.04]">
        Elgon
      </p>
    </footer>
  );
}
