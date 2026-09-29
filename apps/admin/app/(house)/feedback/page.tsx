'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, EyeOff, Frown, Globe, Meh, MessageCircleHeart, Smile } from 'lucide-react';
import type { FeedbackDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { dateRange, dateShort } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Empty, PageHeader, Pill, Skeleton, Tabs } from '@/components/ui/bits';
import { useConfirm } from '@/components/ui/confirm';

const FACE = {
  GOOD: { icon: Smile, label: 'Good', cls: 'text-success bg-success/10' },
  OK: { icon: Meh, label: 'OK', cls: 'text-warning bg-warning/10' },
  BAD: { icon: Frown, label: 'Not good', cls: 'text-danger bg-danger/10' },
} as const;

export default function FeedbackPage() {
  const qc = useQueryClient();
  const can = useCan();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('open');
  const { data, isLoading } = useQuery({ queryKey: ['feedback', filter], queryFn: () => get<FeedbackDTO[]>(`/feedback${filter === 'all' ? '' : `?filter=${filter}`}`) });
  const all = useQuery({ queryKey: ['feedback', 'all'], queryFn: () => get<FeedbackDTO[]>('/feedback') });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'handled' | 'publish' | 'unpublish' }) => post(`/feedback/${id}/${action}`),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['feedback'] }); toast.success(v.action === 'publish' ? 'On the website now (Guest voices)' : v.action === 'unpublish' ? 'Taken off the website' : 'Marked as dealt with'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  });
  const counts = { GOOD: 0, OK: 0, BAD: 0 };
  for (const f of all.data ?? []) counts[f.score]++;
  const total = counts.GOOD + counts.OK + counts.BAD;

  return (
    <div className="fade-in">
      <PageHeader title="Feedback" description="What guests said at check-out or afterwards from their stay page. Anything less than good waits here until someone deals with it." />

      {total > 0 && (
        <div className="card mb-5 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[13px] text-fg-muted"><b className="text-[1.6rem] font-semibold text-fg tabular">{Math.round((counts.GOOD / total) * 100)}%</b> said good · {total} answers</p>
            <ul className="flex gap-4 text-[12.5px]">
              {(Object.keys(FACE) as (keyof typeof FACE)[]).map((k) => { const F = FACE[k]; return <li key={k} className="flex items-center gap-1.5"><F.icon className={cn('size-4', F.cls.split(' ')[0])} aria-hidden /> {F.label} <b className="tabular">{counts[k]}</b></li>; })}
            </ul>
          </div>
          <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
            <span className="bg-success" style={{ width: `${(counts.GOOD / total) * 100}%` }} />
            <span className="bg-warning" style={{ width: `${(counts.OK / total) * 100}%` }} />
            <span className="bg-danger" style={{ width: `${(counts.BAD / total) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <Tabs className="px-3" value={filter} onChange={setFilter} items={[{ value: 'open', label: 'Needs attention' }, { value: 'public', label: 'May be quoted' }, { value: 'all', label: 'Everything' }]} />
        <ul className="divide-y divide-line">
          {isLoading && Array.from({ length: 4 }, (_, i) => <li key={i} className="p-5"><Skeleton className="h-16" /></li>)}
          {data?.map((f) => {
            const F = FACE[f.score];
            return (
              <li key={f.id} className="flex flex-wrap items-start gap-4 p-5">
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', F.cls)} title={F.label}><F.icon className="size-5" aria-label={F.label} /></span>
                <div className="min-w-[16rem] flex-1">
                  <p className="text-[14px] leading-relaxed">{f.comment ? `“${f.comment}”` : <span className="text-fg-muted">Just a tap — {F.label.toLowerCase()}.</span>}</p>
                  <p className="mt-1.5 text-[12.5px] text-fg-muted">
                    <Link href={`/guests/${f.guest.id}`} className="font-medium text-fg hover:underline">{f.guest.name}</Link>{f.guest.country && ` · ${f.guest.country}`} · <Link href={`/reservations/${f.reservation.id}`} className="font-mono hover:underline">{f.reservation.code}</Link> · {dateRange(f.reservation.arrival, f.reservation.departure)} · said {dateShort(f.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.allowPublic && <Pill tone="green">May be quoted</Pill>}
                    {f.published && <Pill tone="dark"><Globe className="size-3" /> On the website</Pill>}
                    {f.handledAt && f.score !== 'GOOD' && <Pill>Dealt with {dateShort(f.handledAt)}</Pill>}
                  </div>
                </div>
                {can('feedback:manage') && (
                  <div className="flex flex-wrap gap-2">
                    {!f.handledAt && f.score !== 'GOOD' && <Button size="sm" icon={<Check className="size-3.5" />} loading={act.isPending && act.variables?.id === f.id} onClick={() => act.mutate({ id: f.id, action: 'handled' })}>Dealt with</Button>}
                    {f.allowPublic && f.comment && !f.published && <Button size="sm" variant="dark" icon={<Globe className="size-3.5" />} onClick={async () => { if (await confirm({ title: 'Put these words on the website?', body: <>They appear in any “Guest voices” section, signed <b>{f.guest.name.split(' ')[0]}</b>{f.guest.country ? ` from ${f.guest.country}` : ''}. The guest agreed to this.</>, confirm: 'Publish' })) act.mutate({ id: f.id, action: 'publish' }); }}>Show on website</Button>}
                    {f.published && <Button size="sm" icon={<EyeOff className="size-3.5" />} onClick={() => act.mutate({ id: f.id, action: 'unpublish' })}>Take down</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {data && !data.length && <Empty icon={<MessageCircleHeart className="size-5" />} title={filter === 'open' ? 'Nothing waiting' : 'No feedback yet'} body={filter === 'open' ? 'Every less-than-good answer has been dealt with.' : 'Guests are asked at check-out and by email afterwards.'} />}
      </div>
    </div>
  );
}
