'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import { t } from '@reberon/contracts/text';
import { submitWaitlist, type FormState } from '@/app/actions';
import { useSite } from '@/components/site/site-provider';
import { Check, Field, Honeypot, Select, TextArea } from './fields';
import { FormSuccess } from './success';
import { useIdempotencyKey } from './use-idempotency';

const initial: FormState = { status: 'idle' };

export function WaitlistForm({ successMessage }: { successMessage?: string }) {
  const [state, action, pending] = useActionState(submitWaitlist, initial);
  const { rooms } = useSite();
  const key = useIdempotencyKey();
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  if (state.status === 'success' && state.reference) {
    return (
      <FormSuccess
        reference={state.reference}
        title="You are on the list."
        message={successMessage || 'This is not a booking yet. We will contact you on the number you gave when the calendar opens.'}
      />
    );
  }

  return (
    <form action={action} className="relative grid gap-5" noValidate>
      <Honeypot />
      <input type="hidden" name="idempotencyKey" value={key} />
      {state.status === 'error' && state.message && (
        <p role="alert" className="rounded-[var(--r-md)] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" defaultValue={v.name} error={e.name} />
        <Field label="Phone or WhatsApp" name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="07xx xxx xxx" defaultValue={v.phone} error={e.phone} />
        <Field label="Email (optional)" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} className="sm:col-span-2" />
      </div>
      <fieldset className="grid gap-5 rounded-[var(--r-lg)] border border-line p-5">
        <legend className="px-2 text-sm font-semibold">Your stay</legend>
        <Select label="Room" name="roomTypeSlug" defaultValue={v.roomTypeSlug ?? ''}>
          <option value="">Any room</option>
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {t(r.name)} — sleeps {r.sleepsAdults}
            </option>
          ))}
        </Select>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="From" name="preferredFrom" type="date" defaultValue={v.preferredFrom} error={e.preferredFrom} />
          <Field label="To" name="preferredTo" type="date" defaultValue={v.preferredTo} error={e.preferredTo} />
        </div>
        <Check name="flexibleDates" label="My dates are flexible" defaultChecked={v.flexibleDates === 'on'} />
        <div className="grid grid-cols-2 gap-5">
          <Field label="Adults" name="adults" type="number" min={1} max={20} inputMode="numeric" defaultValue={v.adults ?? '2'} error={e.adults} />
          <Field label="Children" name="children" type="number" min={0} max={20} inputMode="numeric" defaultValue={v.children ?? '0'} error={e.children} />
        </div>
      </fieldset>
      <TextArea label="Anything we should know? (optional)" name="note" rows={3} defaultValue={v.note} error={e.note} placeholder="An anniversary, a baby, an early start for Sipi…" />
      <Check
        name="consent"
        required
        error={e.consent}
        label={
          <>
            Contact me when the calendar opens. I understand this is not a booking. <Link href="/legal/privacy" className="underline underline-offset-2">Privacy</Link>
          </>
        }
      />
      <button type="submit" className="btn btn-lg justify-self-start" disabled={pending} aria-busy={pending}>
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        <span className="btn-label">{pending ? 'Adding your name…' : 'Put my name down'}</span>
      </button>
    </form>
  );
}
