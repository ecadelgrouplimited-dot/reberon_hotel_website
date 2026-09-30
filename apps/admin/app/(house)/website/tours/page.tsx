'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus, Rotate3d } from 'lucide-react';
import type { TourAdminDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { get, thumb } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Pill, Skeleton, Status } from '@/components/ui/bits';

type Room = { id: string; name: { en?: string } };
const SPACE_LABEL: Record<string, string> = { LOBBY: 'Lobby', HALL: 'The hall', COMPOUND: 'The compound', BEYOND: 'Beyond the gate' };

export default function ToursPage() {
  const can = useCan();
  const { data } = useQuery({ queryKey: ['tours'], queryFn: () => get<TourAdminDTO[]>('/tours') });
  const rooms = useQuery({ queryKey: ['entity-options-raw', 'room-types'], queryFn: () => get<Room[]>('/room-types') });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => get<Record<string, { value: unknown }>>('/settings') });
  const on = settings.data?.['features.toursEnabled']?.value === true;

  const slots: { key: string; label: string; query: string }[] = [
    ...(rooms.data ?? []).map((r) => ({ key: `ROOM_TYPE|${r.id}|`, label: r.name.en ?? 'Room', query: `space=ROOM_TYPE&roomTypeId=${r.id}` })),
    { key: 'HALL||EMPTY', label: 'The hall — cleared', query: 'space=HALL&variant=EMPTY' },
    { key: 'HALL||SET', label: 'The hall — set for forty', query: 'space=HALL&variant=SET' },
    { key: 'LOBBY||', label: SPACE_LABEL.LOBBY!, query: 'space=LOBBY' },
    { key: 'COMPOUND||', label: SPACE_LABEL.COMPOUND!, query: 'space=COMPOUND' },
    { key: 'BEYOND||', label: SPACE_LABEL.BEYOND!, query: 'space=BEYOND' },
  ];
  const slotOf = (x: TourAdminDTO) => `${x.space}|${x.roomTypeId ?? ''}|${x.variant ?? ''}`;

  return (
    <div className="fade-in">
      <PageHeader
        title="Virtual tours"
        description="A walk through each room and the hall. Start with the drawings while the paint is wet; when a real camera walk exists, add it as the live tour in the same place and it replaces the drawings everywhere — no page needs editing."
        actions={can('content:write') && <Button variant="primary" href="/website/tours/new" icon={<Plus className="size-4" />}>New tour</Button>}
      />
      {settings.data && !on && (
        <p className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px]">Tours are <b>switched off</b> on the website. Nothing here shows to guests until the owner turns on <Link href="/settings" className="font-semibold underline">Settings → Features → Virtual tours</Link>.</p>
      )}
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[14rem_1fr_1fr] gap-4 border-b border-line bg-surface-2/60 px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle md:grid">
          <span>Where</span><span>Before opening</span><span>Live</span>
        </div>
        {!data && <div className="p-5"><Skeleton className="h-64" /></div>}
        {data && slots.map((s) => {
          const inSlot = data.filter((x) => slotOf(x) === s.key);
          return (
            <div key={s.key} className="grid gap-3 border-b border-line px-5 py-4 last:border-0 md:grid-cols-[14rem_1fr_1fr] md:gap-4">
              <p className="self-center text-[14px] font-medium">{s.label}</p>
              {(['PRE_OPENING', 'LIVE'] as const).map((stage) => {
                const list = inSlot.filter((x) => x.stage === stage);
                return (
                  <div key={stage} className="grid gap-2">
                    {list.map((x) => <TourCard key={x.id} x={x} />)}
                    {!list.length && can('content:write') && (
                      <Link href={`/website/tours/new?${s.query}&stage=${stage}`} className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-[12.5px] text-fg-muted hover:border-fg/40 hover:text-fg">
                        <Plus className="size-3.5" /> {stage === 'LIVE' ? 'Add the camera walk' : 'Add an image walk'}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TourCard({ x }: { x: TourAdminDTO }) {
  const poster = x.posterId ?? x.mediaIds[0];
  const pct = x.stats.opened ? Math.round((x.stats.completed / x.stats.opened) * 100) : 0;
  return (
    <Link href={`/website/tours/${x.id}`} className={cn('flex items-center gap-3 rounded-xl border p-2.5 transition hover:border-fg/30', x.showing ? 'border-success/40 bg-success/[0.04]' : 'border-line')}>
      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {poster ? <img src={thumb(poster, 320)} alt="" className="size-full object-cover" /> : <Rotate3d className="m-auto mt-4 size-5 text-fg-subtle" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{t(x.title)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Status value={x.status} />
          {x.showing && <Pill tone="green"><Eye className="size-3" /> Showing</Pill>}
          <span className="text-[11.5px] text-fg-subtle">{x.provider === 'DRAWINGS' ? `${x.mediaIds.length} images` : x.provider.toLowerCase().replace('_', ' ')}</span>
        </span>
      </span>
      <span className="hidden text-right text-[11.5px] text-fg-muted sm:block">
        <b className="text-[14px] text-fg tabular">{x.stats.opened}</b> walks<br />{pct}% to the end · {x.stats.paid} booked
      </span>
    </Link>
  );
}
