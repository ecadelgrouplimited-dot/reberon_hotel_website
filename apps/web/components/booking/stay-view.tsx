'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, Frown, LoaderCircle, Meh, MessageSquare, Printer, Smile } from 'lucide-react';
import type { GuestStayDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { formatMoney, whatsappLink, type Currency } from '@reberon/utils';
import { cn } from '@/lib/cn';
import { useSite } from '@/components/site/site-provider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const money = (m: string, c: string) => formatMoney(BigInt(m), c as Currency).replace(/\.00$/, '');
const fmt = (s: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T12:00:00Z`));

export function StayView({ code, token, waitForPayment }: { code: string; token: string; waitForPayment?: boolean }) {
  const { site, openEnquiry } = useSite();
  const [s, setS] = useState<GuestStayDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    let stop = false;
    let n = 0;
    const load = async () => {
      const r = await fetch(`${API}/v1/public/bookings/${code}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (!r.ok) return setError('We could not find that booking. Check the link, or look it up with your code and phone number.');
      const j = (await r.json()) as GuestStayDTO;
      if (stop) return;
      setS(j);
      n++;
      setWaited(n);
      // After returning from the payment page, keep checking until the payment lands.
      if (waitForPayment && j.status === 'HELD' && n < 30) setTimeout(load, 2000);
    };
    void load();
    return () => { stop = true; };
  }, [code, token, waitForPayment]);

  async function pay() {
    setPaying(true);
    const r = await fetch(`${API}/v1/public/bookings/${code}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token }) });
    const j = await r.json();
    if (!r.ok) { setError(j.detail ?? 'Could not start the payment'); setPaying(false); return; }
    window.location.href = j.redirectUrl;
  }

  if (error) return <p role="alert" className="rounded-[var(--r-md)] border border-danger/30 bg-danger/5 px-4 py-3 text-danger">{error}</p>;
  if (!s) return <div className="grid place-items-center py-24"><LoaderCircle className="size-6 animate-spin text-fg-subtle" /></div>;

  const confirmed = ['CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT'].includes(s.status);
  const balance = BigInt(s.balanceMinor);
  const heading =
    s.status === 'HELD' ? (waitForPayment && waited < 30 ? 'Confirming your payment…' : 'Your room is held — payment not received yet')
    : s.status === 'CONFIRMED' ? (waitForPayment ? `You are booked, ${s.guestName.split(' ')[0]}.` : `Your stay, ${s.guestName.split(' ')[0]}`)
    : s.status === 'IN_HOUSE' ? `Welcome to Reberon, ${s.guestName.split(' ')[0]}.`
    : s.status === 'CHECKED_OUT' ? `Thank you for staying, ${s.guestName.split(' ')[0]}.`
    : s.status === 'CANCELLED' ? 'This booking is cancelled'
    : s.status === 'EXPIRED' ? 'This hold has ended'
    : 'Your stay';

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        <p className="eyebrow">Booking <span className="font-mono tracking-normal">{s.code}</span></p>
        <h1 className="mt-4 flex items-center gap-4 text-step-5">
          {heading}
          {s.status === 'HELD' && waitForPayment && waited < 30 && <LoaderCircle className="size-8 animate-spin text-fg-subtle" />}
        </h1>
        {confirmed && waitForPayment && <p className="mt-4 text-step-1 text-fg-muted">Your confirmation is on its way by email. Everything is below — bookmark this page.</p>}
        {s.status === 'HELD' && s.holdExpiresAt && (!waitForPayment || waited >= 30) && <p className="mt-4 text-step-1 text-fg-muted">We hold your room until {new Date(s.holdExpiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })}. If the payment did not go through, try again below.</p>}
        {s.canGiveFeedback && <Feedback code={s.code} token={token} initial={s.feedback} after={s.status === 'CHECKED_OUT'} onSaved={(f) => setS({ ...s, feedback: f })} />}
        {s.status === 'EXPIRED' && <p className="mt-4 text-step-1 text-fg-muted">No payment arrived in time, so the room is free again. Nothing was charged. <a className="underline" href={`/book?arrival=${s.arrival}&departure=${s.departure}&adults=${s.adults}`}>Start again</a>.</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--r-lg)] border border-line p-5"><p className="flex items-center gap-2 text-sm text-fg-muted"><CalendarCheck className="size-4" /> Arrive</p><p className="mt-2 text-lg font-medium">{fmt(s.arrival)}</p><p className="text-sm text-fg-muted">from {s.checkIn}</p></div>
          <div className="rounded-[var(--r-lg)] border border-line p-5"><p className="flex items-center gap-2 text-sm text-fg-muted"><Clock className="size-4" /> Leave</p><p className="mt-2 text-lg font-medium">{fmt(s.departure)}</p><p className="text-sm text-fg-muted">by {s.checkOut}</p></div>
        </div>

        <ul className="mt-6 grid gap-4">
          {s.rooms.map((r, i) => (
            <li key={i} className="flex items-center gap-4 rounded-[var(--r-lg)] border border-line p-3">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-[var(--r-md)] bg-surface-2">{r.hero && <Image src={r.hero.url} alt="" fill sizes="96px" className="object-cover" />}</div>
              <div>
                <p className="text-lg font-medium">{r.quantity > 1 ? `${r.quantity} × ` : ''}{t(r.name)}</p>
                <p className="text-sm text-fg-muted">{s.nights} night{s.nights === 1 ? '' : 's'} · {s.adults} adult{s.adults > 1 ? 's' : ''}{s.children ? `, ${s.children} child${s.children > 1 ? 'ren' : ''}` : ''} · {t(s.ratePlan.name)}</p>
                {s.extras.length > 0 && <p className="mt-1 text-sm text-fg-muted">With {s.extras.map((e) => `${t(e.name)} × ${e.quantity}`).join(', ')}</p>}
              </div>
            </li>
          ))}
        </ul>

        {confirmed && (
          <div className="mt-10 rounded-[var(--r-lg)] bg-surface-2 p-6 text-sm leading-relaxed">
            <p className="font-semibold">Before you drive</p>
            <p className="mt-2 text-fg-muted">Leave Kampala by 6:30 to miss the Jinja traffic — six to seven hours with a lunch stop in Mbale. The last kilometre is murram; take it slowly after rain. Call us from Mbale if you will arrive after dark; the gate is staffed all night.</p>
            <a className="mt-3 inline-block underline" href="/kapchorwa/getting-here">Directions and the road, stop by stop</a>
          </div>
        )}
        <p className="mt-8 text-sm text-fg-subtle"><b>Cancellation:</b> {t(s.cancellation)}</p>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-28">
        <div className="rounded-[var(--r-lg)] border border-line bg-surface p-6">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-fg-muted">Total</dt><dd className="font-semibold tabular">{money(s.totalMinor, s.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-muted">Paid</dt><dd className="tabular text-success">{money(s.paidMinor, s.currency)}</dd></div>
            <div className={cn('flex justify-between border-t border-line pt-2 text-base font-semibold', balance <= 0n && 'text-success')}><dt>{balance > 0n ? (s.status === 'HELD' ? 'To pay' : 'Balance at the house') : 'Paid in full'}</dt><dd className="tabular">{balance > 0n ? money(s.balanceMinor, s.currency) : '✓'}</dd></div>
          </dl>
          {s.canPayBalance && balance > 0n && (
            <button type="button" className="btn mt-5 w-full" disabled={paying} onClick={pay}>{paying && <LoaderCircle className="size-4 animate-spin" />}<span className="btn-label">{s.status === 'HELD' ? 'Pay the deposit' : `Pay ${money(s.balanceMinor, s.currency)} now`}</span></button>
          )}
        </div>
        <button type="button" className="btn btn-secondary w-full" onClick={() => openEnquiry({ intent: 'STAY' })}><MessageSquare className="size-4" /> Ask for something</button>
        {site.contact.whatsapp && <a className="btn btn-secondary w-full" href={whatsappLink(site.contact.whatsapp, `Hello, this is ${s.guestName} about booking ${s.code}.`)} target="_blank" rel="noreferrer">WhatsApp the desk</a>}
        <button type="button" className="btn btn-ghost justify-self-center" onClick={() => window.print()}><Printer className="size-4" /> <span className="btn-label">Print</span></button>
      </aside>
    </div>
  );
}

const FACES = [
  ['GOOD', 'Good', Smile],
  ['OK', 'OK', Meh],
  ['BAD', 'Not good', Frown],
] as const;
type Score = (typeof FACES)[number][0];

/** One tap is enough. Words and permission to quote are optional. */
function Feedback({ code, token, initial, after, onSaved }: { code: string; token: string; initial: GuestStayDTO['feedback']; after: boolean; onSaved: (f: NonNullable<GuestStayDTO['feedback']>) => void }) {
  const [score, setScore] = useState<Score | null>(initial?.score ?? null);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [allowPublic, setAllowPublic] = useState(initial?.allowPublic ?? false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [message, setMessage] = useState('');
  async function send(next: Score = score!) {
    setState('saving');
    const r = await fetch(`${API}/v1/public/bookings/${code}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: token, score: next, comment: comment || undefined, allowPublic }) });
    if (!r.ok) {
      setMessage(((await r.json().catch(() => ({}))) as { detail?: string }).detail ?? 'Could not send. Try again.');
      return setState('error');
    }
    setState('saved');
    onSaved({ score: next, comment: comment || null, allowPublic });
  }
  return (
    <section id="feedback" className="mt-10 scroll-mt-28 rounded-[var(--r-xl)] border border-line p-6 sm:p-8">
      <h2 className="text-step-2">{after ? 'How was your stay?' : 'How is your stay so far?'}</h2>
      <p className="mt-2 text-fg-muted">{after ? 'One tap is enough. The owner reads every answer.' : 'If something is not right, tell us now — we would rather fix it tonight.'}</p>
      <div className="mt-6 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Your answer">
        {FACES.map(([v, l, Icon]) => (
          <button key={v} type="button" role="radio" aria-checked={score === v} onClick={() => { setScore(v); if (!initial && state === 'idle') void send(v); else setState('idle'); }}
            className={cn('flex h-24 flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] border text-base font-medium transition', score === v ? 'border-fg bg-fg text-bg' : 'border-line hover:border-fg/40')}>
            <Icon className="size-7" aria-hidden /> {l}
          </button>
        ))}
      </div>
      {score && (
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{score === 'GOOD' ? 'What did you like?' : 'What should we do better?'} <span className="font-normal text-fg-muted">(optional)</span></span>
            <textarea className="min-h-28 rounded-[var(--r-md)] border border-line bg-surface p-3 text-base" value={comment} onChange={(e) => { setComment(e.target.value); if (state === 'saved') setState('idle'); }} maxLength={2000} />
          </label>
          {score === 'GOOD' && (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4" checked={allowPublic} onChange={(e) => { setAllowPublic(e.target.checked); if (state === 'saved') setState('idle'); }} />
              <span>You may quote my words on the Reberon website, with my first name and country.</span>
            </label>
          )}
          <div className="flex items-center gap-4">
            <button type="button" className="btn" disabled={state === 'saving' || state === 'saved'} onClick={() => send()}>{state === 'saving' && <LoaderCircle className="size-4 animate-spin" />}<span className="btn-label">{state === 'saved' ? 'Sent — thank you' : 'Send'}</span></button>
            {state === 'error' && <p role="alert" className="text-sm text-danger">{message}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
