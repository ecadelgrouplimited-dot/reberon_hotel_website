'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import type { HouseReportDTO } from '@reberon/contracts';
import { get } from '@/lib/api';
import { money } from '@/lib/money';
import { dateRange } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Skeleton } from '@/components/ui/bits';
import { TextInput } from '@/components/ui/field';
import { BarList, ColumnChart, StatTile } from '@/components/charts/charts';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const SOURCE: Record<string, string> = { DIRECT: 'Website', WHATSAPP: 'WhatsApp', WALK_IN: 'Walk-in', PHONE: 'Phone', PORTAL: 'Portal' };

const PERIODS = {
  last30: { label: 'Last 30 days', range: () => [plus(today(), -30), plus(today(), -1)] },
  month: { label: 'This month', range: () => [`${today().slice(0, 8)}01`, today()] },
  last90: { label: 'Last 90 days', range: () => [plus(today(), -90), plus(today(), -1)] },
  next30: { label: 'Next 30 days (on the books)', range: () => [today(), plus(today(), 29)] },
} as const;
type Period = keyof typeof PERIODS | 'custom';

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('last30');
  const [custom, setCustom] = useState({ from: plus(today(), -30), to: today() });
  const [from, to] = period === 'custom' ? [custom.from, custom.to] : PERIODS[period].range();
  const { data: r, isLoading } = useQuery({ queryKey: ['report', from, to], queryFn: () => get<HouseReportDTO>(`/reports/house?from=${from}&to=${to}`), enabled: from <= to });
  const ugx = (m: string) => money(m, 'UGX');
  const usdNote = (m: string) => (m !== '0' ? ` + ${money(m, 'USD')}` : '');

  const csv = () => {
    if (!r) return;
    const rows = [['date', 'rooms_available', 'rooms_sold', 'occupancy_pct'], ...r.days.map((d) => [d.date, d.available, d.sold, d.occupancy])];
    const blob = new Blob([rows.map((x) => x.join(',')).join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `reberon-occupancy-${from}-to-${to}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fade-in">
      <PageHeader title="Reports" description="How the house is doing. Room revenue is counted on the nights guests sleep, at the rate they booked." actions={r && <Button icon={<Download className="size-4" />} onClick={csv}>Download CSV</Button>} />

      <div className="mb-5 flex flex-wrap items-end gap-2">
        {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setPeriod(k)} className={cn('h-9 rounded-full border px-4 text-[13px] font-medium', period === k ? 'border-fg bg-fg text-bg' : 'border-line-strong hover:border-fg/40')}>{PERIODS[k].label}</button>
        ))}
        <button type="button" onClick={() => setPeriod('custom')} className={cn('h-9 rounded-full border px-4 text-[13px] font-medium', period === 'custom' ? 'border-fg bg-fg text-bg' : 'border-line-strong hover:border-fg/40')}>Choose dates</button>
        {period === 'custom' && (
          <div className="flex gap-2">
            <TextInput type="date" aria-label="From" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <TextInput type="date" aria-label="To" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </div>

      {isLoading || !r ? <Skeleton className="h-96" /> : (
        <div className="grid gap-5">
          <p className="text-[13px] text-fg-muted">{dateRange(r.from, plus(r.to, 1))}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Occupancy" value={`${r.totals.occupancy}%`} note={`${r.totals.roomNightsSold} of ${r.totals.roomNightsAvailable} room nights`} />
            <StatTile label="Average rate (ADR)" value={ugx(r.totals.adr.UGX)} note={r.totals.adr.USD !== '0' ? `USD bookings: ${money(r.totals.adr.USD, 'USD')}` : 'per room night sold'} />
            <StatTile label="Revenue per available room" value={ugx(r.totals.revpar.UGX)} note="RevPAR, UGX bookings" />
            <StatTile label="Room revenue" value={ugx(r.totals.roomRevenue.UGX)} note={`${r.totals.roomRevenue.USD !== '0' ? `and ${money(r.totals.roomRevenue.USD, 'USD')} · ` : ''}+ ${ugx(r.totals.otherRevenue.UGX)} food & extras`} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Money received" value={ugx(r.totals.collected.UGX)} note={`payments less refunds${usdNote(r.totals.collected.USD)}`} />
            <StatTile label="Average stay" value={`${r.totals.averageStay} nights`} note={`${r.totals.returningGuests} returning guest${r.totals.returningGuests === 1 ? '' : 's'}`} />
            <StatTile label="New bookings" value={r.totals.bookings} note="made in this period" />
            <StatTile label="Cancelled · no-show" value={`${r.totals.cancellations} · ${r.totals.noShows}`} />
          </div>

          <Section title="Occupancy by night">
            <ColumnChart data={r.days.map((d) => ({ date: d.date, count: d.occupancy }))} label="Occupancy" max={100} format={(n) => `${Math.round(n)}%`} endLabel="last" caption={<>Share of rooms sold each night · average <b className="text-fg">{r.totals.occupancy}%</b></>} height={200} />
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Where bookings come from" description="Room nights in this period">
              {r.sourceMix.length ? <BarList data={r.sourceMix.map((x) => ({ label: SOURCE[x.source] ?? x.source, value: x.roomNights }))} /> : <p className="text-[13px] text-fg-muted">No stays.</p>}
            </Section>
            <Section title="Room types" description="Occupancy by type (%)">
              <BarList data={r.roomTypes.map((x) => ({ label: x.name, value: x.occupancy }))} />
            </Section>
            <Section title="How far ahead people book" description="Bookings made in this period">
              <BarList data={r.leadTime.map((x) => ({ label: x.bucket, value: x.bookings }))} />
            </Section>
            <Section title="What guests said" description="Feedback given in this period">
              <BarList data={[{ label: 'Good', value: r.feedback.GOOD }, { label: 'OK', value: r.feedback.OK }, { label: 'Not good', value: r.feedback.BAD }]} />
            </Section>
          </div>
          <p className="text-[12px] text-fg-subtle">{r.currencyNote}</p>
        </div>
      )}
    </div>
  );
}
