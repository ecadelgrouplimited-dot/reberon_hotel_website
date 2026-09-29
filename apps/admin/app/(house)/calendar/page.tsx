'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ApiError, get, patch, put } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { toMinorStr } from '@/lib/money';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Skeleton } from '@/components/ui/bits';
import { TextInput } from '@/components/ui/field';

type Day = { date: string; total: number; sold: number; held: number; blocked: number; stopSell: boolean; closedToArrival: boolean; minStay: number | null; note: string | null; rates: Record<string, { UGX: string | null; USD: string | null }> };
type Cal = { dates: string[]; ratePlans: { id: string; code: string; name: { en?: string } }[]; roomTypes: { id: string; name: { en?: string }; rooms: number; days: Day[] }[] };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000));
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const compact = (minor: string | null, cur: 'UGX' | 'USD') => {
  if (!minor) return '—';
  const v = cur === 'USD' ? Number(minor) / 100 : Number(minor);
  return cur === 'USD' ? `$${Math.round(v)}` : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `${Math.round(v / 1000)}k`;
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const can = useCan();
  const [from, setFrom] = useState(iso(new Date()));
  const [planId, setPlanId] = useState('');
  const [cur, setCur] = useState<'UGX' | 'USD'>('UGX');
  const days = 28;
  const { data, isLoading } = useQuery({ queryKey: ['calendar', from], queryFn: () => get<Cal>(`/calendar?from=${from}&days=${days}`) });
  useEffect(() => {
    if (data && !planId) setPlanId(data.ratePlans[0]?.id ?? '');
  }, [data, planId]);

  // Selection: rows × a contiguous date range, made by dragging.
  const [sel, setSel] = useState<{ rows: string[]; a: number; b: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);
  const lo = sel ? Math.min(sel.a, sel.b) : -1;
  const hi = sel ? Math.max(sel.a, sel.b) : -1;
  const inSel = (row: string, i: number) => !!sel && sel.rows.includes(row) && i >= lo && i <= hi;

  const plan = data?.ratePlans.find((p) => p.id === planId);
  const totals = useMemo(() => data?.dates.map((d, i) => {
    let free = 0, total = 0;
    for (const rt of data.roomTypes) {
      const x = rt.days[i]!;
      total += x.total;
      free += x.stopSell ? 0 : Math.max(0, x.total - x.sold - x.held - x.blocked);
    }
    return { d, free, total, occ: total ? Math.round(((total - free) / total) * 100) : 0 };
  }), [data]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Calendar & rates"
        description="What is free, what it costs, in which currency. Drag across nights to change prices or close dates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !min-h-9 !w-auto" value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label="Rate plan">
              {data?.ratePlans.map((p) => <option key={p.id} value={p.id}>{p.name.en}</option>)}
            </select>
            <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-semibold">
              {(['UGX', 'USD'] as const).map((c) => <button key={c} type="button" onClick={() => setCur(c)} className={cn('rounded-full px-3 py-1.5', cur === c ? 'bg-fg text-bg' : 'text-fg-muted')}>{c}</button>)}
            </div>
            <Button size="icon" aria-label="Earlier" onClick={() => setFrom(addDays(from, -14))}><ChevronLeft className="size-4" /></Button>
            <Button size="sm" onClick={() => setFrom(iso(new Date()))}>Today</Button>
            <Button size="icon" aria-label="Later" onClick={() => setFrom(addDays(from, 14))}><ChevronRight className="size-4" /></Button>
          </div>
        }
      />
      {isLoading || !data ? <Skeleton className="h-96" /> : (
        <div className="card overflow-x-auto select-none">
          <table className="border-separate border-spacing-0 text-[12px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-44 border-b border-r border-line bg-surface px-3 py-2 text-left font-semibold">{new Date(`${from}T12:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</th>
                {data.dates.map((d) => {
                  const dt = new Date(`${d}T12:00:00Z`);
                  const wk = [5, 6].includes(dt.getUTCDay());
                  return (
                    <th key={d} className={cn('min-w-[3.4rem] border-b border-line px-1 py-1.5 text-center font-medium', wk && 'bg-surface-2', d === iso(new Date()) && 'text-accent')}>
                      <span className="block text-[10.5px] text-fg-subtle">{DOW[dt.getUTCDay()]}</span>
                      <span className="tabular">{dt.getUTCDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.roomTypes.map((rt) => (
                <tr key={rt.id}>
                  <th className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left">
                    <span className="block font-semibold">{rt.name.en}</span>
                    <span className="text-[11px] font-normal text-fg-subtle">{rt.rooms} room{rt.rooms === 1 ? '' : 's'}</span>
                  </th>
                  {rt.days.map((x, i) => {
                    const free = x.stopSell ? 0 : Math.max(0, x.total - x.sold - x.held - x.blocked);
                    const ratio = x.total ? free / x.total : 0;
                    const wk = [5, 6].includes(new Date(`${x.date}T12:00:00Z`).getUTCDay());
                    const price = x.rates[planId]?.[cur] ?? null;
                    return (
                      <td
                        key={x.date}
                        onMouseDown={() => { if (!can('rates:write')) return; setDragging(true); setSel({ rows: [rt.id], a: i, b: i }); }}
                        onMouseEnter={() => dragging && sel && setSel({ rows: sel.rows.includes(rt.id) ? sel.rows : [...sel.rows, rt.id], a: sel.a, b: i })}
                        title={`${x.date}: ${free} of ${x.total} free · ${x.sold} sold · ${x.held} held · ${x.blocked} blocked${x.minStay ? ` · min ${x.minStay} nights` : ''}${x.note ? ` · ${x.note}` : ''}`}
                        className={cn('relative h-14 cursor-pointer border-b border-l border-line/60 px-1 text-center align-middle transition-colors', wk && 'bg-surface-2/60', inSel(rt.id, i) && '!bg-brand/15 outline outline-1 -outline-offset-1 outline-brand')}
                        style={x.stopSell ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in oklab, var(--danger) 18%, transparent) 5px 7px)' } : undefined}
                      >
                        <span className={cn('mx-auto block w-fit rounded px-1.5 text-[11px] font-semibold tabular', x.stopSell ? 'text-danger' : ratio === 0 ? 'bg-danger/12 text-danger' : ratio < 0.5 ? 'bg-warning/15 text-warning' : 'bg-success/12 text-success')}>
                          {x.stopSell ? 'closed' : `${free}/${x.total}`}
                        </span>
                        <span className={cn('mt-1 block tabular', price ? 'text-fg' : 'text-fg-subtle')}>{compact(price, cur)}</span>
                        {(x.minStay || x.closedToArrival) && <span className="absolute right-0.5 top-0.5 text-[9px] font-semibold text-info">{x.closedToArrival ? '⇥' : ''}{x.minStay ? `${x.minStay}n` : ''}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th className="sticky left-0 z-10 border-r border-line bg-surface px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Occupancy</th>
                {totals?.map((tt) => <td key={tt.d} className="px-1 py-2 text-center text-[11px] tabular text-fg-muted">{tt.occ}%</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[12px] text-fg-subtle">Cells show rooms free / total and the {plan?.name.en ?? ''} price per night in {cur}. ⇥ = no arrivals, “2n” = minimum stay. Hover a cell for details.</p>
      {sel && data && <EditPanel sel={{ rows: sel.rows, from: data.dates[lo]!, to: data.dates[hi]! }} planId={planId} planName={plan?.name.en ?? ''} names={Object.fromEntries(data.roomTypes.map((r) => [r.id, r.name.en ?? '']))} onClose={() => setSel(null)} onDone={() => { qc.invalidateQueries({ queryKey: ['calendar'] }); setSel(null); }} />}
    </div>
  );
}

function EditPanel({ sel, planId, planName, names, onClose, onDone }: { sel: { rows: string[]; from: string; to: string }; planId: string; planName: string; names: Record<string, string>; onClose: () => void; onDone: () => void }) {
  const [ugx, setUgx] = useState('');
  const [usd, setUsd] = useState('');
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [stopSell, setStopSell] = useState<boolean | null>(null);
  const [cta, setCta] = useState<boolean | null>(null);
  const [minStay, setMinStay] = useState('');
  const [blocked, setBlocked] = useState('');
  const nights = Math.round((Date.parse(sel.to) - Date.parse(sel.from)) / 86_400_000) + 1;
  const m = useMutation({
    mutationFn: async () => {
      const u = ugx ? toMinorStr(ugx, 'UGX') : undefined;
      const d = usd ? toMinorStr(usd, 'USD') : undefined;
      const out: string[] = [];
      if (u || d) {
        const r = await put<{ updated: number }>('/rates', { ratePlanId: planId, roomTypeIds: sel.rows, from: sel.from, to: sel.to, weekdays, ...(u ? { ugx: u } : {}), ...(d ? { usd: d } : {}) });
        out.push(`${r.updated} prices`);
      }
      if (stopSell !== null || cta !== null || minStay || blocked) {
        const r = await patch<{ updated: number }>('/inventory', { roomTypeIds: sel.rows, from: sel.from, to: sel.to, ...(stopSell !== null ? { stopSell } : {}), ...(cta !== null ? { closedToArrival: cta } : {}), ...(minStay ? { minStay: minStay === '1' ? null : Number(minStay) } : {}), ...(blocked ? { blockedRooms: Number(blocked) } : {}) });
        out.push(`${r.updated} nights`);
      }
      if (!out.length) throw new Error('Nothing to change');
      return out.join(' and ');
    },
    onSuccess: (s) => { toast.success(`Updated ${s} — the website shows it now`); onDone(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });
  const Tri = ({ label, value, set }: { label: string; value: boolean | null; set: (v: boolean | null) => void }) => (
    <div className="flex items-center justify-between gap-3 text-[13px]"><span>{label}</span>
      <span className="inline-flex rounded-full border border-line p-0.5 text-[11.5px] font-semibold">
        {([[null, 'Keep'], [true, 'Yes'], [false, 'No']] as const).map(([v, l]) => <button key={l} type="button" onClick={() => set(v)} className={cn('rounded-full px-2.5 py-1', value === v ? 'bg-fg text-bg' : 'text-fg-muted')}>{l}</button>)}
      </span>
    </div>
  );
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] fade-in">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{nights} night{nights > 1 ? 's' : ''} · {sel.rows.map((r) => names[r]).join(', ')}</p>
          <p className="text-[12.5px] text-fg-muted">{sel.from} → {sel.to}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-surface-2"><X className="size-4" /></button>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">Price per night · {planName}</p>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="UGX" inputMode="numeric" placeholder="e.g. 250000" value={ugx} onChange={(e) => setUgx(e.target.value)} />
            <TextInput label="USD" inputMode="decimal" placeholder="e.g. 70" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {DOW.map((d, i) => <button key={d} type="button" onClick={() => setWeekdays(weekdays.includes(i) ? weekdays.filter((x) => x !== i) : [...weekdays, i])} className={cn('rounded-full border px-2.5 py-1 text-[11.5px] font-semibold', weekdays.includes(i) ? 'border-fg bg-fg text-bg' : 'border-line text-fg-muted')}>{d}</button>)}
          </div>
          <p className="text-[11.5px] text-fg-subtle">Only the ticked weekdays change — e.g. tick Fr and Sa for weekend prices. Both currencies are set independently; nothing is converted.</p>
        </div>
        <div className="grid content-start gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">Availability</p>
          <Tri label="Stop selling" value={stopSell} set={setStopSell} />
          <Tri label="No arrivals" value={cta} set={setCta} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Minimum stay" inputMode="numeric" placeholder="nights" value={minStay} onChange={(e) => setMinStay(e.target.value)} />
            <TextInput label="Rooms blocked" inputMode="numeric" placeholder="e.g. 1" value={blocked} onChange={(e) => setBlocked(e.target.value)} hint="Maintenance, owner use" />
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={m.isPending} onClick={() => m.mutate()}>Apply</Button></div>
    </div>
  );
}

