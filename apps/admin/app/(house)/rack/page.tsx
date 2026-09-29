'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BrushCleaning, CheckCheck, CircleCheck, Lock, Unlock } from 'lucide-react';
import type { HkStatus, RackRoomDTO } from '@reberon/contracts';
import { ApiError, del, get, patch, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { dateRange } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Skeleton } from '@/components/ui/bits';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput, TextInput } from '@/components/ui/field';
import { useConfirm } from '@/components/ui/confirm';
import { BLOCK_REASON, HK, HkBadge, RackGrid, RackLegend, TASK_KIND } from '@/components/house/hk';

type Block = { id: string; room: { id: string; number: string }; fromDate: string; toDate: string; reason: string; note: string | null };
const kampalaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const err = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Could not save');

function Rack() {
  const qc = useQueryClient();
  const can = useCan();
  const router = useRouter();
  const params = useSearchParams();
  const rack = useQuery({ queryKey: ['rack'], queryFn: () => get<RackRoomDTO[]>('/rack'), refetchInterval: 20_000 });
  const blocks = useQuery({ queryKey: ['room-blocks'], queryFn: () => get<Block[]>('/room-blocks') });
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => setRoomId(params.get('room')), [params]);
  const room = rack.data?.find((r) => r.id === roomId) ?? null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['rack'] }); qc.invalidateQueries({ queryKey: ['room-blocks'] }); qc.invalidateQueries({ queryKey: ['desk'] }); };
  const close = () => { setRoomId(null); router.replace('/rack'); };

  return (
    <div className="fade-in">
      <PageHeader title="Room rack" description="Every room in the house and the state it is in right now. Tap a room to change it." actions={rack.data && <RackLegend rooms={rack.data} />} />
      <div className="card p-5">{rack.data ? <RackGrid rooms={rack.data} onPick={(r) => setRoomId(r.id)} /> : <Skeleton className="h-80" />}</div>

      <Section className="mt-5" title="Off sale" description="Rooms blocked for maintenance, the owner or staff. Blocked nights are taken out of what the website can sell.">
        {!blocks.data?.length ? <p className="text-[13px] text-fg-muted">No rooms are blocked.</p> : (
          <ul className="-my-2 divide-y divide-line text-[13px]">
            {blocks.data.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="font-semibold tabular">Room {b.room.number}</span>
                <span>{dateRange(b.fromDate, b.toDate)}</span>
                <span className="text-fg-muted">{BLOCK_REASON[b.reason]}{b.note && ` — ${b.note}`}</span>
                {can('rooms:manage') && <ReleaseButton block={b} onDone={refresh} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <RoomDrawer room={room} onClose={close} onChange={refresh} />
    </div>
  );
}

function ReleaseButton({ block, onDone }: { block: Block; onDone: () => void }) {
  const confirm = useConfirm();
  const m = useMutation({ mutationFn: () => del(`/room-blocks/${block.id}`), onSuccess: () => { toast.success(`Room ${block.room.number} is back on sale`); onDone(); }, onError: err });
  return <Button size="sm" className="ml-auto" icon={<Unlock className="size-3.5" />} loading={m.isPending} onClick={async () => { if (await confirm({ title: `Put room ${block.room.number} back on sale?`, body: 'The remaining nights become bookable on the website straight away.', confirm: 'Release' })) m.mutate(); }}>Release</Button>;
}

function RoomDrawer({ room, onClose, onChange }: { room: RackRoomDTO | null; onClose: () => void; onChange: () => void }) {
  const can = useCan();
  const setStatus = useMutation({ mutationFn: (status: HkStatus) => patch(`/rack/${room!.id}/status`, { status }), onSuccess: () => { toast.success('Updated'); onChange(); }, onError: err });
  const today = kampalaToday();
  const [block, setBlock] = useState({ fromDate: today, toDate: plus(today, 1), reason: 'MAINTENANCE', note: '' });
  useEffect(() => { if (room) setBlock({ fromDate: today, toDate: plus(today, 1), reason: 'MAINTENANCE', note: '' }); }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const makeBlock = useMutation({ mutationFn: () => post('/room-blocks', { roomId: room!.id, ...block, note: block.note || undefined }), onSuccess: () => { toast.success(`Room ${room!.number} is off sale for those nights`); onChange(); }, onError: err });

  const vacant = room && !['OCCUPIED', 'BLOCKED', 'OUT_OF_ORDER'].includes(room.hkStatus);
  return (
    <Dialog open={!!room} onClose={onClose} drawer title={room ? `Room ${room.number}` : ''} description={room?.roomType.name}>
      {room && (
        <div className="grid gap-6">
          <div className={`rounded-2xl border p-4 ${HK[room.hkStatus].tile}`}>
            <HkBadge status={room.hkStatus} className="text-[14px]" />
            {room.occupant && <p className="mt-2 text-[13px]"><Link className="font-semibold hover:underline" href={`/reservations/${room.occupant.reservationId}`}>{room.occupant.guestName}</Link> · {room.occupant.code} · {room.occupant.departsToday ? 'leaves today' : `until ${room.occupant.departure}`}</p>}
            {room.arriving && <p className="mt-2 text-[13px]">Arriving today: <Link className="font-semibold hover:underline" href={`/reservations/${room.arriving.reservationId}`}>{room.arriving.guestName}</Link></p>}
            {room.block && <p className="mt-2 text-[13px]">{BLOCK_REASON[room.block.reason]}, {dateRange(room.block.fromDate, room.block.toDate)}{room.block.note && ` — ${room.block.note}`}</p>}
            {room.task && <p className="mt-2 text-[13px] text-fg-muted">Today: {TASK_KIND[room.task.kind]} · {room.task.status.toLowerCase().replace('_', ' ')}</p>}
          </div>

          {vacant && (
            <section className="grid gap-2">
              <p className="font-semibold">Set the room</p>
              <div className="grid grid-cols-3 gap-2">
                <Button size="touch" icon={<BrushCleaning className="size-5" />} disabled={room.hkStatus === 'VACANT_DIRTY'} loading={setStatus.isPending && setStatus.variables === 'VACANT_DIRTY'} onClick={() => setStatus.mutate('VACANT_DIRTY')}>Dirty</Button>
                <Button size="touch" icon={<CircleCheck className="size-5" />} disabled={room.hkStatus === 'VACANT_CLEAN'} loading={setStatus.isPending && setStatus.variables === 'VACANT_CLEAN'} onClick={() => setStatus.mutate('VACANT_CLEAN')}>Clean</Button>
                {can('rooms:inspect') && <Button size="touch" icon={<CheckCheck className="size-5" />} disabled={room.hkStatus === 'INSPECTED'} loading={setStatus.isPending && setStatus.variables === 'INSPECTED'} onClick={() => setStatus.mutate('INSPECTED')}>Inspected</Button>}
              </div>
            </section>
          )}

          {can('rooms:manage') && !room.block && (
            <section className="grid gap-3">
              <p className="font-semibold">Take off sale</p>
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="From" type="date" min={today} value={block.fromDate} onChange={(e) => setBlock({ ...block, fromDate: e.target.value })} />
                <TextInput label="Until (morning of)" type="date" min={plus(block.fromDate, 1)} value={block.toDate} onChange={(e) => setBlock({ ...block, toDate: e.target.value })} />
                <SelectInput label="Why" value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })}>{Object.entries(BLOCK_REASON).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectInput>
                <TextInput label="Note" value={block.note} onChange={(e) => setBlock({ ...block, note: e.target.value })} placeholder="What is being fixed" />
              </div>
              <Button variant="dark" icon={<Lock className="size-4" />} loading={makeBlock.isPending} disabled={block.toDate <= block.fromDate} onClick={() => makeBlock.mutate()}>Block room {room.number}</Button>
              <p className="text-[12px] text-fg-subtle">If every room of this type is already sold on a night, the block is refused rather than overselling.</p>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

export default function Page() {
  return <Suspense><Rack /></Suspense>;
}
