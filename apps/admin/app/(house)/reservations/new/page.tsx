'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Minus, Plus } from 'lucide-react';
import type { AvailabilityDTO, WaitlistEntryDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { money } from '@/lib/money';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Skeleton } from '@/components/ui/bits';
import { SelectInput, Switch, TextArea, TextInput } from '@/components/ui/field';

const today = () => new Date().toISOString().slice(0, 10);
const kampalaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function NewReservation() {
  const params = useSearchParams();
  const router = useRouter();
  const fromWaitlist = params.get('waitlist');
  const walkIn = params.get('walkin') === '1';
  const [arrival, setArrival] = useState(walkIn ? kampalaToday() : plus(today(), 7));
  const [departure, setDeparture] = useState(walkIn ? plus(kampalaToday(), 1) : plus(today(), 9));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [currency, setCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [pick, setPick] = useState<{ roomTypeId: string; ratePlanId: string; rooms: number } | null>(null);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' });
  const [source, setSource] = useState(walkIn ? 'WALK_IN' : 'PHONE');
  const [confirmNow, setConfirmNow] = useState(walkIn);
  const [notes, setNotes] = useState('');

  const wl = useQuery({ queryKey: ['waitlist-entry', fromWaitlist], queryFn: () => get<WaitlistEntryDTO>(`/waitlist/${fromWaitlist}`), enabled: !!fromWaitlist });
  useEffect(() => {
    const w = wl.data;
    if (!w) return;
    setGuest({ name: w.contact.name, phone: w.contact.phone ?? '', email: w.contact.email ?? '' });
    if (w.preferredFrom && w.preferredTo && w.preferredFrom >= today()) {
      setArrival(w.preferredFrom);
      setDeparture(w.preferredTo);
    }
    setAdults(w.adults);
    setChildren(w.children);
    setSource('WHATSAPP');
    if (w.note) setNotes(`From the first-stay list (${w.reference}): ${w.note}`);
  }, [wl.data]);

  const valid = arrival < departure;
  const q = useQuery({
    queryKey: ['quote', arrival, departure, adults, children, currency],
    queryFn: () => get<AvailabilityDTO>(`/reservations-quote?arrival=${arrival}&departure=${departure}&adults=${adults}&children=${children}&currency=${currency}`),
    enabled: valid,
  });
  useEffect(() => setPick(null), [arrival, departure, adults, children, currency]);

  const offer = q.data?.offers.find((o) => o.roomType.id === pick?.roomTypeId);
  const plan = offer?.plans.find((p) => p.ratePlanId === pick?.ratePlanId);
  const perRoom = plan ? BigInt(plan.totalMinor) / BigInt(offer!.roomsNeeded) : 0n;
  const roomsTotal = perRoom * BigInt(pick?.rooms ?? 0);
  const extrasTotal = Object.entries(extras).reduce((a, [id, n]) => {
    const e = q.data?.extras.find((x) => x.id === id);
    const unit = e ? BigInt(currency === 'UGX' ? e.price.ugx : (e.price.usd ?? '0')) : 0n;
    return a + unit * BigInt(n) * (e?.unit === 'PER_NIGHT' ? BigInt(q.data!.nights) : 1n);
  }, 0n);

  const create = useMutation({
    mutationFn: () =>
      post<{ id: string; code: string; paymentLink: string | null }>('/reservations', {
        arrival, departure, adults, children, currency, roomTypeId: pick!.roomTypeId, ratePlanId: pick!.ratePlanId, rooms: pick!.rooms,
        extras: Object.entries(extras).filter(([, n]) => n > 0).map(([extraId, quantity]) => ({ extraId, quantity })),
        guest, source, confirmNow, staffNotes: notes || undefined, fromWaitlistId: fromWaitlist ?? undefined,
      }),
    onSuccess: (r) => {
      toast.success(confirmNow ? `${r.code} confirmed` : `${r.code} held for 24 hours${r.paymentLink ? ' — payment link ready' : ''}`);
      router.replace(walkIn && confirmNow && arrival === kampalaToday() ? `/reservations/${r.id}?checkin=1` : `/reservations/${r.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : 'Could not create'),
  });

  const Stepper = ({ value, set, min = 0 }: { value: number; set: (n: number) => void; min?: number }) => (
    <span className="inline-flex items-center rounded-full border border-line-strong">
      <button type="button" className="grid size-8 place-items-center disabled:opacity-30" disabled={value <= min} onClick={() => set(value - 1)} aria-label="Fewer"><Minus className="size-3.5" /></button>
      <span className="w-6 text-center tabular">{value}</span>
      <button type="button" className="grid size-8 place-items-center" onClick={() => set(value + 1)} aria-label="More"><Plus className="size-3.5" /></button>
    </span>
  );

  return (
    <div className="fade-in">
      <PageHeader crumbs={walkIn ? [{ label: 'Front desk', href: '/desk' }, { label: 'Walk-in' }] : [{ label: 'Reservations', href: '/reservations' }, { label: 'New' }]} title={walkIn ? 'Walk-in' : 'New reservation'} description={walkIn ? 'Someone at the desk now. Book tonight, then check them straight in.' : fromWaitlist ? 'Converting a name from the first-stay list.' : 'For a phone call, a WhatsApp chat or someone at the desk.'} />
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-5">
          <Section title="1 · When and who">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <TextInput label="Arrival" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
              <TextInput label="Departure" type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} error={valid ? undefined : 'After arrival'} />
              <div className="grid gap-1.5"><span className="label">Adults</span><Stepper value={adults} set={setAdults} min={1} /></div>
              <div className="grid gap-1.5"><span className="label">Children</span><Stepper value={children} set={setChildren} /></div>
              <SelectInput label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as 'UGX' | 'USD')}><option value="UGX">UGX</option><option value="USD">USD</option></SelectInput>
            </div>
          </Section>

          <Section title="2 · Room and rate" description={q.data ? `${q.data.nights} night${q.data.nights > 1 ? 's' : ''}` : undefined}>
            {q.isLoading && <Skeleton className="h-40" />}
            <ul className="grid gap-3">
              {q.data?.offers.map((o) => (
                <li key={o.roomType.id} className={cn('rounded-2xl border p-4', o.plans.length ? 'border-line' : 'border-line opacity-60')}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{o.roomType.name.en}</p>
                    <p className="text-[12.5px] text-fg-muted">{o.available} free · party needs {o.roomsNeeded}</p>
                  </div>
                  {o.unavailableReason ? <p className="mt-1 text-[12.5px] text-fg-muted">{o.unavailableReason}</p> : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {o.plans.map((p) => {
                        const on = pick?.roomTypeId === o.roomType.id && pick.ratePlanId === p.ratePlanId;
                        return (
                          <button key={p.ratePlanId} type="button" onClick={() => setPick({ roomTypeId: o.roomType.id, ratePlanId: p.ratePlanId, rooms: o.roomsNeeded })} className={cn('flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition', on ? 'border-fg bg-surface-2' : 'border-line hover:border-line-strong')}>
                            <span><span className="block text-[13px] font-medium">{p.name.en}</span><span className="text-[12px] text-fg-muted">{p.depositPercent}% deposit</span></span>
                            <span className="flex items-center gap-2 text-right"><span className="font-semibold tabular">{money(p.totalMinor, currency)}</span>{on && <Check className="size-4" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {pick && (
            <Section title="3 · Extras">
              <ul className="grid gap-2 sm:grid-cols-2">
                {q.data?.extras.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]">
                    <span><span className="block font-medium">{e.name.en}</span><span className="text-fg-muted">{money(currency === 'UGX' ? e.price.ugx : e.price.usd, currency)} {e.unit.toLowerCase().replace('_', ' ')}</span></span>
                    <Stepper value={extras[e.id] ?? 0} set={(n) => setExtras({ ...extras, [e.id]: n })} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {pick && (
            <Section title="4 · Guest">
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput label="Name" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
                <TextInput label="Phone" required value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="07xx…" />
                <TextInput label="Email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} hint="For the confirmation" />
                <SelectInput label="Booked by" value={source} onChange={(e) => setSource(e.target.value)}><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option><option value="WALK_IN">At the desk</option><option value="DIRECT">Email / other</option></SelectInput>
                <TextArea label="Notes for the desk" wrapClassName="sm:col-span-2" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </Section>
          )}
        </div>

        <aside className="card grid gap-4 p-5 xl:sticky xl:top-20">
          <p className="font-semibold">Summary</p>
          {!pick ? <p className="text-[13px] text-fg-muted">Choose a room and rate.</p> : (
            <>
              <div className="flex items-center justify-between text-[13px]"><span>{offer?.roomType.name.en} × {pick.rooms}</span><Stepper value={pick.rooms} set={(n) => setPick({ ...pick, rooms: Math.max(offer!.roomsNeeded, Math.min(n, offer!.available)) })} min={offer!.roomsNeeded} /></div>
              <dl className="grid gap-1.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-fg-muted">Rooms</dt><dd className="tabular">{money(roomsTotal, currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-fg-muted">Extras</dt><dd className="tabular">{money(extrasTotal, currency)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold"><dt>Total</dt><dd className="tabular">{money(roomsTotal + extrasTotal, currency)}</dd></div>
              </dl>
              <Switch label="Confirm now" hint={confirmNow ? 'Rooms are sold now; take payment at the desk.' : 'Held for 24 hours with a payment link you can send on WhatsApp.'} checked={confirmNow} onChange={setConfirmNow} />
              <Button variant="primary" size="lg" loading={create.isPending} disabled={!guest.name || !guest.phone} onClick={() => create.mutate()}>{walkIn && confirmNow ? 'Book and go to check-in' : confirmNow ? 'Confirm reservation' : 'Hold and create payment link'}</Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><NewReservation /></Suspense>;
}
