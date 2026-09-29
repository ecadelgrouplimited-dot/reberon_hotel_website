'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { EnquiryForm } from '@/components/forms/enquiry-form';
import { useSite } from './site-provider';

/** The enquiry form as a sheet over any page, carrying context (room, intent). */
export function EnquirySheet() {
  const { enquiry, closeEnquiry } = useSite();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (enquiry && !d.open) d.showModal();
    if (!enquiry && d.open) d.close();
  }, [enquiry]);

  return (
    <dialog ref={ref} className="sheet" onClose={closeEnquiry} aria-labelledby="enquiry-title" onClick={(e) => e.target === ref.current && closeEnquiry()}>
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6" onClick={(e) => e.target === e.currentTarget && closeEnquiry()}>
        <div className="sheet-panel relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-bg p-6 text-fg shadow-[var(--shadow-lift)] sm:rounded-[28px] sm:p-10">
          <button type="button" onClick={closeEnquiry} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-line hover:bg-surface-2" aria-label="Close">
            <X className="size-5" strokeWidth={1.6} />
          </button>
          <p className="eyebrow">Enquire</p>
          <h2 id="enquiry-title" className="mb-2 mt-3 text-step-3">
            {enquiry?.roomName ? `Ask about the ${enquiry.roomName}` : 'Ask us anything'}
          </h2>
          <p className="mb-8 text-fg-muted">A person reads every message. Leave a phone number and we can reply on WhatsApp.</p>
          {enquiry && <EnquiryForm intent={enquiry.intent} roomTypeSlug={enquiry.roomTypeSlug} />}
        </div>
      </div>
    </dialog>
  );
}
