'use client';
import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Contact, Search, Star } from 'lucide-react';
import type { GuestSummaryDTO } from '@reberon/contracts';
import { get } from '@/lib/api';
import { money } from '@/lib/money';
import { dateShort } from '@/lib/format';
import { Empty, PageHeader, Pill, Skeleton, Tabs } from '@/components/ui/bits';

export default function GuestsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const term = useDeferredValue(q);
  const qs = new URLSearchParams({ ...(filter !== 'all' ? { filter } : {}), ...(term ? { q: term } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ['guests', qs.toString()], queryFn: () => get<{ data: GuestSummaryDTO[]; total: number }>(`/guests?${qs}`), placeholderData: (p) => p });
  const withMoney = data?.data.some((g) => g.spent);

  return (
    <div className="fade-in">
      <PageHeader title="Guests" description="Everyone who has booked, with their whole history in one place. The desk sees who is coming back." />
      <div className="card overflow-hidden">
        <Tabs className="px-3" value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Everyone' }, { value: 'returning', label: 'Returning' }, { value: 'vip', label: 'VIP' }]} />
        <div className="border-b border-line p-3">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input className="input !min-h-9 pl-9" placeholder="Name, phone, email or booking code" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-surface-2/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">
              <tr><th className="px-4 py-2.5">Guest</th><th className="px-4 py-2.5 text-right">Stays</th><th className="px-4 py-2.5 text-right">Nights</th><th className="px-4 py-2.5">Last stay</th><th className="px-4 py-2.5">Next</th>{withMoney && <th className="px-4 py-2.5 text-right">Paid (UGX)</th>}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && Array.from({ length: 8 }, (_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>)}
              {data?.data.map((g) => (
                <tr key={g.id} className="cursor-pointer hover:bg-surface-2/50" onClick={() => router.push(`/guests/${g.id}`)}>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-medium">{g.name}{g.isVip && <Star className="size-3.5 fill-current text-warning" aria-label="VIP" />}{g.stays >= 2 && <Pill tone="blue">Regular</Pill>}</p>
                    <p className="text-[12px] text-fg-muted">{[g.phone, g.email, g.country].filter(Boolean).join(' · ')}</p>
                    {g.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{g.tags.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">{t}</span>)}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular">{g.stays}</td>
                  <td className="px-4 py-3 text-right tabular">{g.nights}</td>
                  <td className="px-4 py-3 tabular text-fg-muted">{g.lastStay ? dateShort(g.lastStay) : '—'}</td>
                  <td className="px-4 py-3 tabular">{g.nextStay ? <b>{dateShort(g.nextStay)}</b> : <span className="text-fg-subtle">—</span>}</td>
                  {withMoney && <td className="px-4 py-3 text-right tabular">{g.spent ? money(g.spent.UGX, 'UGX').replace('UGX', '').trim() : ''}{g.spent && g.spent.USD !== '0' && <span className="block text-[11.5px] text-fg-muted">{money(g.spent.USD, 'USD')}</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {data && !data.data.length && <Empty icon={<Contact className="size-5" />} title={term ? 'Nobody matches that' : 'No guests yet'} body="Guests appear here after their first booking." />}
        </div>
      </div>
    </div>
  );
}
