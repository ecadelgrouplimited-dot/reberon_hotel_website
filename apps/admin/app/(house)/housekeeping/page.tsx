'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellOff, CheckCheck, CircleCheck, Play, RotateCcw, Sparkles, UserRound } from 'lucide-react';
import type { HkBoardDTO, HkTaskDTO, HkTaskStatus } from '@reberon/contracts';
import { ApiError, get, patch } from '@/lib/api';
import { useCan, useMe } from '@/lib/providers';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Empty, Pill, Skeleton } from '@/components/ui/bits';
import { HkBadge, TASK_KIND } from '@/components/house/hk';

type Filter = 'mine' | 'open' | 'all';

export default function HousekeepingPage() {
  const me = useMe();
  const can = useCan();
  const qc = useQueryClient();
  const supervisor = can('rooms:inspect');
  const [filter, setFilter] = useState<Filter>(supervisor ? 'open' : 'mine');
  const { data, isLoading } = useQuery({ queryKey: ['housekeeping'], queryFn: () => get<HkBoardDTO>('/housekeeping'), refetchInterval: 20_000 });
  const act = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patch(`/housekeeping/tasks/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['housekeeping'] }); qc.invalidateQueries({ queryKey: ['rack'] }); qc.invalidateQueries({ queryKey: ['desk'] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  });
  const tasks = data?.tasks ?? [];
  const open = (t: HkTaskDTO) => t.status === 'TODO' || t.status === 'IN_PROGRESS';
  const shown = tasks.filter((t) => (filter === 'all' ? true : filter === 'open' ? open(t) || (supervisor && t.status === 'DONE') : open(t) && (!t.assignee || t.assignee.id === me.id)));
  const finished = tasks.filter((t) => ['DONE', 'INSPECTED', 'SKIPPED'].includes(t.status)).length;
  const pct = tasks.length ? Math.round((finished / tasks.length) * 100) : 0;
  const date = data && new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${data.date}T12:00:00Z`));

  return (
    <div className="fade-in mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="text-[13px] font-medium text-fg-muted">{date ?? ' '}</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight">Housekeeping</h1>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Rooms finished">
            <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[13px] font-semibold tabular">{finished}/{tasks.length} done</span>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1" role="tablist">
        {([['mine', 'My rooms'], ['open', supervisor ? 'To do & check' : 'Everyone'], ['all', 'All today']] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={filter === v} type="button" onClick={() => setFilter(v)} className={cn('h-12 rounded-full text-[14px] font-medium transition', filter === v ? 'bg-surface shadow-[var(--shadow-soft)]' : 'text-fg-muted')}>{l}</button>
        ))}
      </div>

      <div className="grid gap-3">
        {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36" />)}
        {data && !shown.length && <div className="card"><Empty icon={<Sparkles className="size-5" />} title={filter === 'mine' ? 'Nothing waiting for you' : 'All rooms are done'} body="New rooms appear here as guests check out." /></div>}
        {shown.map((t) => <TaskCard key={t.id} t={t} meId={me.id} supervisor={supervisor} busy={act.isPending && act.variables?.id === t.id} onAct={(body) => act.mutate({ id: t.id, body })} />)}
      </div>
    </div>
  );
}

function TaskCard({ t, meId, supervisor, busy, onAct }: { t: HkTaskDTO; meId: string; supervisor: boolean; busy: boolean; onAct: (body: Record<string, unknown>) => void }) {
  const set = (status: HkTaskStatus) => onAct({ status });
  const finished = ['DONE', 'INSPECTED', 'SKIPPED'].includes(t.status);
  return (
    <article className={cn('card p-4', t.status === 'IN_PROGRESS' && '!border-info ring-1 ring-info/40', finished && 'opacity-70')}>
      <div className="flex items-start gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[1.6rem] font-semibold tabular">{t.room.number}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[1.05rem] font-semibold">{TASK_KIND[t.kind]}</p>
            {t.arrivalToday && !finished && <Pill tone="red" dot>Guest arriving — first</Pill>}
            {t.status === 'IN_PROGRESS' && <Pill tone="blue" dot>Cleaning now</Pill>}
            {t.status === 'DONE' && <Pill tone="green">Clean — to check</Pill>}
            {t.status === 'INSPECTED' && <Pill tone="green"><CheckCheck className="size-3" /> Inspected</Pill>}
            {t.status === 'SKIPPED' && <Pill>Skipped</Pill>}
          </div>
          <p className="mt-0.5 text-[13px] text-fg-muted">{t.room.roomTypeName} · {t.room.floor === 1 ? 'ground floor' : 'upper floor'}{t.guestFirstName && t.kind === 'STAYOVER' ? ` · ${t.guestFirstName} staying` : ''}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12.5px]">
            <HkBadge status={t.room.hkStatus} />
            {t.assignee && <span className="flex items-center gap-1 text-fg-muted"><UserRound className="size-3.5" /> {t.assignee.id === meId ? 'You' : t.assignee.name}</span>}
          </div>
          {t.notes && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">{t.notes}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        {t.status === 'TODO' && <Button variant="primary" size="touch" icon={<Play className="size-5" />} loading={busy} onClick={() => set('IN_PROGRESS')}>Start</Button>}
        {t.status === 'IN_PROGRESS' && <Button variant="primary" size="touch" icon={<CircleCheck className="size-5" />} loading={busy} onClick={() => set('DONE')}>Done — room is clean</Button>}
        {t.status === 'DONE' && supervisor && <Button variant="dark" size="touch" icon={<CheckCheck className="size-5" />} loading={busy} onClick={() => set('INSPECTED')}>Checked — ready to sell</Button>}
        {t.status === 'DONE' && !supervisor && <p className="self-center text-[13px] text-fg-muted">Waiting for a supervisor to check.</p>}
        {(t.status === 'INSPECTED' || t.status === 'SKIPPED') && <span />}
        {t.status === 'TODO' && t.kind === 'STAYOVER' && <Button size="touch" icon={<BellOff className="size-5" />} aria-label="Guest does not want service" onClick={() => onAct({ status: 'SKIPPED', notes: 'Guest asked not to be disturbed' })}>Not today</Button>}
        {t.status === 'TODO' && t.kind !== 'STAYOVER' && !t.assignee && <Button size="touch" onClick={() => onAct({ assigneeId: meId })}>Take it</Button>}
        {(t.status === 'DONE' || t.status === 'IN_PROGRESS' || t.status === 'SKIPPED') && <Button size="touch" variant="ghost" icon={<RotateCcw className="size-5" />} aria-label="Undo" onClick={() => set(t.status === 'DONE' ? 'IN_PROGRESS' : 'TODO')} />}
      </div>
    </article>
  );
}
