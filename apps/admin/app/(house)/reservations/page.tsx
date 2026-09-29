'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import type { ReservationSummaryDTO } from '@reberon/contracts';
import { get } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { dateRange, ago } from '@/lib/format';
import { money } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Empty, PageHeader, Pill, Skeleton, Status, Tabs } from '@/components/ui/bits';

const SOURCE: Record<string, string> = { DIRECT: 'Website', WHATSAPP: 'WhatsApp', WALK_IN: 'Walk-in', PHONE: 'Phone', PORTAL: 'Portal' };

export default function ReservationsPage() {
  const [status, setStatus] = useState('upcoming');
  const [q, setQ] = useState('');
  const router = useRouter();
  const can = useCan();
  const qs = new URLSearchParams({ ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}), ...(status === 'upcoming' ? {} : { sort: 'created' }) });
  const { data, isLoading } = useQuery({ queryKey: ['reservations', qs.toString()], queryFn: () => get<{ data: ReservationSummaryDTO[]; counts: Record<string, number> }>(`/reservations?${qs}`), refetchInterval: 30_000 });
  const c = data?.counts ?? {};
  return (
    <div className="fade-in">
      <PageHeader
        title="Reservations"
        description="Every booking, from the website, WhatsApp, the phone or the desk. One record each; everything else points here."
        actions={can('bookings:write') && <Button variant="primary" href="/reservations/new" icon={<Plus className="size-4" />}>New reservation</Button>}
      />
      <div className="card overflow-hidden">
        <Tabs
          className="px-3"
          value={status}
          onChange={setStatus}
          items={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'HELD', label: 'Waiting for payment', count: c.HELD ?? 0 },
            { value: 'CONFIRMED', label: 'Confirmed', count: c.CONFIRMED ?? 0 },
            { value: 'CANCELLED', label: 'Cancelled', count: c.CANCELLED ?? 0 },
            { value: 'EXPIRED', label: 'Expired holds', count: c.EXPIRED ?? 0 },
            { value: 'all', label: 'All' },
          ]}
        />
        <div className="border-b border-line p-3">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input className="input !min-h-9 pl-9" placeholder="Name, phone or RB- code" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead className="bg-surface-2/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">
              <tr><th className="px-4 py-2.5">Guest</th><th className="px-4 py-2.5">Stay</th><th className="px-4 py-2.5">Room</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-right">Balance</th><th className="px-4 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && Array.from({ length: 8 }, (_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>)}
              {data?.data.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-surface-2/50" onClick={() => router.push(`/reservations/${r.id}`)}>
                  <td className="px-4 py-3">
                    <Link href={`/reservations/${r.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{r.guest.name}</Link>
                    <span className="block text-[12px] text-fg-subtle"><span className="font-mono">{r.code}</span> · {SOURCE[r.source] ?? r.source} · {ago(r.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">{dateRange(r.arrival, r.departure)}<span className="block text-[12px] text-fg-subtle">{r.adults} adult{r.adults > 1 ? 's' : ''}{r.children ? ` + ${r.children}` : ''}</span></td>
                  <td className="px-4 py-3">{r.roomSummary}</td>
                  <td className="px-4 py-3 text-right tabular">{money(r.totalMinor, r.currency)}</td>
                  <td className="px-4 py-3 text-right tabular">{BigInt(r.balanceMinor) > 0n ? <span className="font-medium">{money(r.balanceMinor, r.currency)}</span> : <span className="text-success">Paid</span>}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5"><Status value={r.status} />{r.status === 'HELD' && r.holdExpiresAt && <Pill tone="amber">until {new Date(r.holdExpiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala' })}</Pill>}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !data?.data.length && <Empty title="No reservations here" body="Bookings from the website arrive on their own; phone and WhatsApp bookings are added with New reservation." />}
        </div>
      </div>
    </div>
  );
}
