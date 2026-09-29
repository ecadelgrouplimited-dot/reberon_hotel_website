'use client';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { get, post } from '@/lib/api';
import { useCan, useMe } from '@/lib/providers';
import { dateShort } from '@/lib/format';
import { money } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Empty, PageHeader, Section, Skeleton, Status } from '@/components/ui/bits';
import { StatTile } from '@/components/charts/charts';

type Brief = {
  date: string; tomorrow: string;
  arrivals: { id: string; code: string; name: string; status: string; eta: string | null; rooms: string; balance: string }[];
  occupancy: { tonight: number; total: number; percent: number };
  clearedToday: { UGX: string; USD: string; count: number };
  promised: { id: string; code: string; name: string; status: string; arrival: string; balance: string }[];
};

/** Spec M21: Denis should not hunt for numbers. */
export default function BriefPage() {
  const me = useMe();
  const can = useCan();
  const { data: b, isLoading } = useQuery({ queryKey: ['brief'], queryFn: () => get<Brief>('/owner/brief'), refetchInterval: 60_000 });
  const send = useMutation({ mutationFn: () => post('/owner/brief/send'), onSuccess: () => toast.success('Brief emailed to the owners') });
  if (isLoading || !b) return <Skeleton className="h-96" />;
  return (
    <div className="fade-in">
      <PageHeader
        title="Owner brief"
        description={`Tomorrow’s names, tonight’s rooms, today’s money. Emailed to the owners every evening at 19:00. ${dateShort(b.date)}.`}
        actions={can('settings:features') && <Button icon={<Send className="size-4" />} loading={send.isPending} onClick={() => send.mutate()}>Email it now</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Occupied tonight" value={`${b.occupancy.tonight} of ${b.occupancy.total}`} note={`${b.occupancy.percent}% of rooms`} />
        <StatTile label="Arriving tomorrow" value={b.arrivals.length} note={dateShort(b.tomorrow)} />
        <StatTile label="Cleared today" value={money(b.clearedToday.UGX, 'UGX')} note={`${BigInt(b.clearedToday.USD) > 0n ? `+ ${money(b.clearedToday.USD, 'USD')} · ` : ''}${b.clearedToday.count} payment${b.clearedToday.count === 1 ? '' : 's'}`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section title="Tomorrow">
          {!b.arrivals.length ? <Empty title="No arrivals tomorrow" /> : (
            <ul className="-my-2 divide-y divide-line text-[13px]">
              {b.arrivals.map((a) => (
                <li key={a.id}><Link href={`/reservations/${a.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:underline"><span className="font-medium">{a.name}</span><span className="text-fg-muted">{a.rooms}{a.eta ? ` · ETA ${a.eta}` : ''}</span><span className="ml-auto tabular">{a.balance} due</span><Status value={a.status} /></Link></li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Still promised" description="Money owed on holds and on stays in the next week.">
          {!b.promised.length ? <Empty title="Nothing outstanding" /> : (
            <ul className="-my-2 divide-y divide-line text-[13px]">
              {b.promised.map((p) => (
                <li key={p.id}><Link href={`/reservations/${p.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:underline"><span className="font-medium">{p.name}</span><span className="text-fg-muted">arrives {dateShort(p.arrival)}</span><span className="ml-auto tabular font-medium">{p.balance}</span><Status value={p.status} /></Link></li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <p className="mt-5 text-[12.5px] text-fg-subtle">Good evening, {me.name.split(' ')[0]}. This page refreshes every minute.</p>
    </div>
  );
}
