'use client';
import { Check } from 'lucide-react';
import { whatsappLink } from '@reberon/utils';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { useSite } from '@/components/site/site-provider';

export function FormSuccess({ reference, message, title = 'Received.' }: { reference: string; message: string; title?: string }) {
  const { site } = useSite();
  return (
    <div role="status" aria-live="polite" className="fade-up rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center" style={{ ['--d' as string]: '0s' }}>
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-moss-700 text-mist-50">
        <Check className="size-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 text-step-3">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-fg-muted">{message}</p>
      <p className="mt-6 text-sm text-fg-subtle">
        Your reference <span className="ml-1 rounded-md bg-surface-2 px-2 py-1 font-mono text-base font-semibold tracking-wider text-fg">{reference}</span>
      </p>
      {site.contact.whatsapp && (
        <a className="btn btn-secondary mt-6" href={whatsappLink(site.contact.whatsapp, `Hello, my reference is ${reference}.`)} target="_blank" rel="noopener noreferrer">
          <WhatsAppGlyph className="size-4" /> Continue on WhatsApp
        </a>
      )}
    </div>
  );
}
