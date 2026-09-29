'use client';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { whatsappLink } from '@reberon/utils';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { useSite } from './site-provider';

export function RoomActions({ slug, name }: { slug: string; name: string }) {
  const { site, openEnquiry } = useSite();
  return (
    <div className="grid gap-2.5">
      <Link href={site.features.bookingEnabled ? `/book?room=${slug}` : `/first-stay?room=${slug}#waitlist`} className="btn btn-lg w-full">
        {site.features.bookingEnabled ? 'Check dates' : 'Claim a first stay'}
      </Link>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="btn btn-secondary" onClick={() => openEnquiry({ intent: 'STAY', roomTypeSlug: slug, roomName: name })}>
          <MessageSquare className="size-4" aria-hidden /> Enquire
        </button>
        {site.contact.whatsapp && (
          <a className="btn btn-secondary" href={whatsappLink(site.contact.whatsapp, `Hello Reberon Hotel, I would like to ask about the ${name}.`)} target="_blank" rel="noopener noreferrer">
            <WhatsAppGlyph className="size-4" /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
