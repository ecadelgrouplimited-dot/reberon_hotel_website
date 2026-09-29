'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { whatsappLink } from '@reberon/utils';
import { cn } from '@/lib/cn';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { useSite } from './site-provider';

/** Mobile: WhatsApp · Call · Enquire, always within thumb reach once past the hero. Hides while typing. */
export function ActionBar() {
  const { site, openEnquiry } = useSite();
  const [show, setShow] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.55);
    const onFocus = (e: FocusEvent) => setTyping(!!(e.target as HTMLElement)?.closest?.('input,textarea,select'));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', () => setTyping(false));
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocus);
    };
  }, []);

  const phone = site.contact.phones[0];
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.72rem] font-semibold tracking-wide';
  return (
    <div
      className={cn(
        'fixed inset-x-3 bottom-3 z-40 flex overflow-hidden rounded-[22px] border border-line bg-[var(--glass)] text-fg shadow-[var(--shadow-lift)] backdrop-blur-xl transition-all duration-500 md:hidden',
        show && !typing ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[130%] opacity-0',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {site.contact.whatsapp && (
        <a href={whatsappLink(site.contact.whatsapp, 'Hello Reberon Hotel, I have a question about a stay.')} target="_blank" rel="noopener noreferrer" className={cn(item, 'text-[#1f8f4e] dark:text-[#5fd08f]')}>
          <WhatsAppGlyph className="size-5" /> WhatsApp
        </a>
      )}
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, '')}`} className={cn(item, 'border-x border-line')}>
          <Phone className="size-5" strokeWidth={1.6} aria-hidden /> Call
        </a>
      )}
      <button type="button" onClick={() => openEnquiry()} className={cn(item, 'bg-accent text-accent-fg')}>
        <MessageSquare className="size-5" strokeWidth={1.6} aria-hidden /> Enquire
      </button>
    </div>
  );
}
