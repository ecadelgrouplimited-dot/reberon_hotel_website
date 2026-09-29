'use client';
import { useActionState } from 'react';
import { usePathname } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { t } from '@reberon/contracts/text';
import { submitEnquiry, type FormState } from '@/app/actions';
import { useSite } from '@/components/site/site-provider';
import { Check, Field, Honeypot, Select, TextArea } from './fields';
import { FormSuccess } from './success';
import { useIdempotencyKey } from './use-idempotency';

const initial: FormState = { status: 'idle' };

export function EnquiryForm({
  intent = 'STAY', roomTypeSlug, successMessage, compact,
}: { intent?: string; roomTypeSlug?: string; successMessage?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(submitEnquiry, initial);
  const { site, rooms } = useSite();
  const pathname = usePathname();
  const key = useIdempotencyKey();
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  if (state.status === 'success' && state.reference) {
    return <FormSuccess reference={state.reference} message={successMessage || t(site.contact.responsePromise) || 'We will reply soon.'} title="Thank you — it reached the desk." />;
  }

  return (
    <form action={action} className="relative grid gap-5" noValidate>
      <Honeypot />
      <input type="hidden" name="idempotencyKey" value={key} />
      <input type="hidden" name="pagePath" value={pathname} />
      {state.status === 'error' && state.message && (
        <p role="alert" className="rounded-[var(--r-md)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" defaultValue={v.name} error={e.name} />
        <Select label="About" name="intent" defaultValue={v.intent ?? intent}>
          <option value="STAY">A stay</option>
          <option value="EVENT">An event or the hall</option>
          <option value="GROUP">A group</option>
          <option value="GENERAL">Something else</option>
        </Select>
        <Field label="Phone or WhatsApp" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" defaultValue={v.phone} error={e.phone} hint="Ugandan numbers need no +256." />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} />
      </div>
      {!compact && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Arriving" name="arrival" type="date" defaultValue={v.arrival} error={e.arrival} />
          <Field label="Leaving" name="departure" type="date" defaultValue={v.departure} error={e.departure} />
          <Field label="Guests" name="adults" type="number" min={1} max={60} inputMode="numeric" defaultValue={v.adults ?? '2'} error={e.adults} />
        </div>
      )}
      {rooms.length > 0 && !compact && (
        <Select label="Room (optional)" name="roomTypeSlug" defaultValue={v.roomTypeSlug ?? roomTypeSlug ?? ''}>
          <option value="">No preference</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {t(r.name)}
            </option>
          ))}
        </Select>
      )}
      {compact && roomTypeSlug && <input type="hidden" name="roomTypeSlug" value={roomTypeSlug} />}
      <TextArea label="Your message" name="message" required rows={4} placeholder="Dates, numbers, questions — a few words is enough." defaultValue={v.message} error={e.message} />
      <Check
        name="consent"
        required
        error={e.consent}
        label={
          <>
            I agree that Reberon Hotel may use these details to reply to me. <Link href="/legal/privacy" className="underline underline-offset-2">Privacy</Link>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-lg" disabled={pending} aria-busy={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          <span className="btn-label">{pending ? 'Sending…' : 'Send enquiry'}</span>
        </button>
        <p className="text-sm text-fg-subtle">{t(site.contact.responsePromise)}</p>
      </div>
    </form>
  );
}
