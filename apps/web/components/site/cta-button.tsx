'use client';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { useSite, type EnquiryPrefill } from './site-provider';

export interface ResolvedCta {
  label: string;
  href: string;
  external: boolean;
  kind: 'whatsapp' | 'call' | 'enquire' | 'link';
}

export function CtaButton({
  cta, style = 'primary', size, prefill, className, children,
}: { cta: ResolvedCta; style?: 'primary' | 'secondary' | 'ghost'; size?: 'lg'; prefill?: EnquiryPrefill; className?: string; children?: ReactNode }) {
  const { openEnquiry } = useSite();
  const cls = cn('btn', style === 'secondary' && 'btn-secondary', style === 'ghost' && 'btn-ghost', size === 'lg' && 'btn-lg', className);
  const icon =
    cta.kind === 'whatsapp' ? <WhatsAppGlyph className="size-[1.1em]" /> : cta.kind === 'call' ? <Phone className="size-[1em]" aria-hidden /> : null;
  const inner = (
    <>
      {icon}
      <span className="btn-label">{children ?? cta.label}</span>
      {!icon && <ArrowRight className="btn-arrow size-[1em]" aria-hidden />}
    </>
  );
  if (cta.kind === 'enquire') {
    return (
      <a
        href={cta.href}
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          openEnquiry(prefill);
        }}
      >
        {inner}
      </a>
    );
  }
  if (cta.external || cta.href.startsWith('tel:')) {
    return (
      <a href={cta.href} className={cls} {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={cls}>
      {inner}
    </Link>
  );
}
