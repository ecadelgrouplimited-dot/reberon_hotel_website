'use client';
import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Receipt, Search } from 'lucide-react';
import { DOCUMENT_LABEL, type DocumentKind, type DocumentRegisterDTO } from '@reberon/contracts';
import { get } from '@/lib/api';
import { money } from '@/lib/money';
import { buttonClass } from '@/components/ui/button';
import { Empty, PageHeader, Skeleton, Tabs } from '@/components/ui/bits';
import { TextInput } from '@/components/ui/field';
import { DocumentRow } from '@/components/documents/documents-panel';

const kampala = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(d);
const monthStart = () => `${kampala().slice(0, 8)}01`;

export default function ReceiptsPage() {
  const [kind, setKind] = useState<'' | DocumentKind>('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(kampala());
  const [q, setQ] = useState('');
  const term = useDeferredValue(q);
  const qs = new URLSearchParams({ ...(kind ? { kind } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(term ? { q: term } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ['documents', 'register', qs.toString()], queryFn: () => get<DocumentRegisterDTO>(`/documents?${qs}`), placeholderData: (p) => p });
  const t = data?.totals;
  const both = (x?: { UGX: string; USD: string }) => (x ? `${money(x.UGX, 'UGX')}${x.USD !== '0' ? ` + ${money(x.USD, 'USD')}` : ''}` : '—');

  return (
    <div className="fade-in">
      <PageHeader
        title="Receipts and invoices"
        description="Every document the hotel has given a guest, in number order. Voided ones stay here, marked, and are left out of the totals."
        actions={<a className={buttonClass('secondary', 'md')} href={`/v1/admin/documents.csv?${qs}`}><Download className="size-4" /> CSV for the accountant</a>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(['RECEIPT', 'REFUND', 'INVOICE'] as const).map((k) => (
          <div key={k} className="card p-4">
            <p className="text-[12.5px] text-fg-muted">{DOCUMENT_LABEL[k]}s · {t?.[k].count ?? 0}</p>
            <p className="mt-1.5 text-[1.3rem] font-semibold tabular">{both(t?.[k])}</p>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <Tabs className="px-3" value={kind} onChange={(v) => setKind(v as '' | DocumentKind)} items={[{ value: '', label: 'Everything' }, { value: 'RECEIPT', label: 'Receipts' }, { value: 'REFUND', label: 'Refund notes' }, { value: 'INVOICE', label: 'Invoices' }]} />
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-3">
          <label className="relative block min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input className="input !min-h-9 pl-9" placeholder="Number, booking code or guest name" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <TextInput aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextInput aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="px-4">
          {isLoading && <Skeleton className="my-4 h-40" />}
          {data && !data.data.length && <Empty icon={<Receipt className="size-5" />} title="Nothing in this period" body="Receipts appear as payments are taken." />}
          <ul className="divide-y divide-line">{data?.data.map((d) => <DocumentRow key={d.id} d={d} showBooking />)}</ul>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-fg-subtle">Each document carries a check code. Anyone holding one can confirm it is genuine on the website’s <b>/verify</b> page. These are hotel receipts, not URA EFRIS fiscal documents.</p>
    </div>
  );
}
