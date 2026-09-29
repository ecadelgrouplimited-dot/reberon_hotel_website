'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BedDouble, Clock, LogIn, LogOut, MessageSquareQuote, Search, Star, UserRoundPlus, UserX } from 'lucide-react';
import type { DeskBoardDTO, DeskStayDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { money } from '@/lib/money';
import { dateShort } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Empty, Pill, Skeleton, Status } from '@/components/ui/bits';
import { useConfirm } from '@/components/ui/confirm';
import { RackGrid, RackLegend } from '@/components/house/hk';
import { CheckInDialog, CheckOutDialog, type StayRef } from '@/components/house/desk-dialogs';

type Tab = 'arrivals' | 'inHouse' | 'departures' | 'late';

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

export default function DeskPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const can = useCan();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('arrivals');
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'in' | 'out'; stay: StayRef } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['desk'], queryFn: () => get<DeskBoardDTO>('/desk'), refetchInterval: 30_000 });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['desk'] });
    qc.invalidateQueries({ queryKey: ['rack'] });
    qc.invalidateQueries({ queryKey: ['reservation'] });
  };
  const noShow = useMutation({
    mutationFn: (s: DeskStayDTO) => post(`/desk/reservations/${s.id}/no-show`, {}),
    onSuccess: () => { toast.success('Marked as no-show. The rooms are back on sale.'); refresh(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update'),
  });

  const c = data?.counts;
  const lists: Record<Tab, DeskStayDTO[]> = { arrivals: data?.arrivals ?? [], inHouse: data?.inHouse ?? [], departures: data?.departures ?? [], late: data?.lateArrivals ?? [] };
  const term = q.trim().toLowerCase();
  const shown = lists[tab].filter((s) => !term || s.guest.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term) || s.rooms.some((r) => r.assigned.some((a) => a.number === term)));
  const heading = data && new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${data.date}T12:00:00Z`));

  const tabs: { v: Tab; label: string; value: string; note: string; hide?: boolean }[] = [
    { v: 'arrivals', label: 'Arriving', value: c ? `${c.arrived}/${c.arrivals}` : '–', note: 'checked in' },
    { v: 'inHouse', label: 'In the house', value: c ? String(c.inHouse) : '–', note: c ? `${c.guestsInHouse} guest${c.guestsInHouse === 1 ? '' : 's'}` : '' },
    { v: 'departures', label: 'Leaving', value: c ? `${c.departed}/${c.departures}` : '–', note: 'checked out' },
    { v: 'late', label: 'Not arrived', value: String(data?.lateArrivals.length ?? 0), note: 'from earlier days', hide: !data?.lateArrivals.length },
  ];

  return (
    <div className="fade-in">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-fg-muted">{heading ?? ' '}</p>
          <h1 className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-tight">Front desk</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input className="input !h-14 !min-h-14 w-64 !rounded-full pl-11 text-[15px]" placeholder="Name, code or room" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {can('bookings:write') && <Button variant="primary" size="touch" href="/reservations/new?walkin=1" icon={<UserRoundPlus className="size-5" />}>Walk-in</Button>}
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4" role="tablist">
        {tabs.filter((t) => !t.hide).map((t) => (
          <button key={t.v} type="button" role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
            className={cn('card flex min-h-[5.5rem] flex-col items-start justify-between p-4 text-left transition', tab === t.v ? '!border-fg ring-1 ring-fg' : 'hover:border-line-strong', t.v === 'late' && 'border-warning/40')}>
            <span className="text-[13px] font-medium text-fg-muted">{t.label}</span>
            <span className="flex items-baseline gap-2"><span className="text-[1.75rem] font-semibold leading-none tabular">{t.value}</span><span className="text-[12px] text-fg-subtle">{t.note}</span></span>
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[1fr_26rem]">
        <section aria-live="polite" className="grid gap-3">
          {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />)}
          {data && !shown.length && (
            <div className="card"><Empty icon={<BedDouble className="size-5" />} title={term ? 'Nobody matches that' : { arrivals: 'No arrivals today', inHouse: 'Nobody in the house', departures: 'No departures today', late: 'Everyone arrived' }[tab]} body={tab === 'arrivals' && !term ? 'Walk-ins can be checked in straight away.' : undefined} /></div>
          )}
          {shown.map((s) => (
            <StayCard key={s.id} s={s} tab={tab}
              onIn={() => setDialog({ kind: 'in', stay: { ...s, keep: s.rooms.flatMap((rr) => rr.assigned.map((a) => ({ reservationRoomId: rr.reservationRoomId, roomId: a.roomId }))) } })}
              onOut={() => setDialog({ kind: 'out', stay: s })}
              onNoShow={async () => { if (await confirm({ title: `Mark ${s.guest.name} as a no-show?`, body: 'Rooms go back on sale. What was paid is kept, following the booking terms.', confirm: 'Mark no-show', danger: true })) noShow.mutate(s); }}
              canMoney={can('payments:record')}
            />
          ))}
        </section>

        <aside className="card p-5 2xl:sticky 2xl:top-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Rooms tonight</p>
            <Link href="/rack" className="text-[12.5px] font-medium text-fg-muted hover:text-fg">Open the rack →</Link>
          </div>
          {data ? (
            <>
              <RackLegend rooms={data.rooms} />
              <div className="mt-4"><RackGrid rooms={data.rooms} compact onPick={(r) => router.push(`/rack?room=${r.id}`)} /></div>
            </>
          ) : <Skeleton className="h-64" />}
        </aside>
      </div>

      <CheckInDialog stay={dialog?.kind === 'in' ? dialog.stay : null} open={dialog?.kind === 'in'} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />
      <CheckOutDialog stay={dialog?.kind === 'out' ? dialog.stay : null} open={dialog?.kind === 'out'} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />
    </div>
  );
}

function StayCard({ s, tab, onIn, onOut, onNoShow, canMoney }: { s: DeskStayDTO; tab: Tab; onIn: () => void; onOut: () => void; onNoShow: () => void; canMoney: boolean }) {
  const assigned = s.rooms.flatMap((r) => r.assigned.map((a) => a.number));
  const balance = BigInt(s.balanceMinor);
  const done = (tab === 'arrivals' && s.status !== 'CONFIRMED' && s.status !== 'HELD') || (tab === 'departures' && s.status === 'CHECKED_OUT');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
  return (
    <article className={cn('card flex flex-wrap items-center gap-x-6 gap-y-4 p-4 sm:p-5', done && 'opacity-60')}>
      <div className="min-w-[14rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/reservations/${s.id}`} className="text-[1.1rem] font-semibold hover:underline">{s.guest.name}</Link>
          {s.isVip && <Pill tone="dark"><Star className="size-3" aria-hidden /> VIP</Pill>}
          {s.previousStays > 0 && <Pill tone="blue">{ordinal(s.previousStays + 1)} stay</Pill>}
          {(done || tab === 'late') && <Status value={s.status} />}
        </div>
        <p className="mt-1 text-[13px] text-fg-muted">
          <span className="font-mono">{s.code}</span> · {s.roomSummary} · {s.nights} night{s.nights > 1 ? 's' : ''} · {s.adults + s.children} guest{s.adults + s.children > 1 ? 's' : ''}
          {tab === 'inHouse' && <> · leaves {s.departure === today ? <b className="text-warning">today</b> : dateShort(s.departure)}</>}
          {tab === 'late' && <> · was due {dateShort(s.arrival)}</>}
        </p>
        {(s.eta || s.guestNotes || s.staffNotes) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            {s.eta && <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-fg-subtle" /> {s.eta}</span>}
            {s.guestNotes && <span className="flex items-center gap-1.5 italic text-fg-muted"><MessageSquareQuote className="size-3.5 text-fg-subtle" /> “{s.guestNotes}”</span>}
            {s.staffNotes && <span className="text-fg-muted">Note: {s.staffNotes.split('\n')[0]}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2" aria-label="Rooms">
        {assigned.length ? assigned.map((n) => <span key={n} className="grid h-14 min-w-14 place-items-center rounded-2xl border border-line-strong px-3 text-[1.2rem] font-semibold tabular">{n}</span>) : <span className="text-[12.5px] text-fg-subtle">No room yet</span>}
      </div>

      {canMoney && (
        <div className="min-w-[7rem] text-right">
          <p className="text-[12px] text-fg-muted">{balance > 0n ? 'To pay' : 'Paid'}</p>
          <p className={cn('font-semibold tabular', balance > 0n ? '' : 'text-success')}>{balance > 0n ? money(balance, s.currency) : '✓'}</p>
        </div>
      )}

      <div className="flex gap-2">
        {(tab === 'arrivals' || tab === 'late') && s.status === 'CONFIRMED' && <Button variant="primary" size="touch" icon={<LogIn className="size-5" />} onClick={onIn}>Check in</Button>}
        {tab === 'arrivals' && s.status === 'HELD' && <Button size="touch" href={`/reservations/${s.id}`}>Awaiting deposit</Button>}
        {tab === 'late' && s.status === 'CONFIRMED' && <Button variant="danger" size="touch" icon={<UserX className="size-5" />} onClick={onNoShow}>No-show</Button>}
        {(tab === 'inHouse' || tab === 'departures') && s.status === 'IN_HOUSE' && <Button variant={tab === 'departures' || s.departure <= today ? 'primary' : 'secondary'} size="touch" icon={<LogOut className="size-5" />} onClick={onOut}>Check out</Button>}
      </div>
    </article>
  );
}
