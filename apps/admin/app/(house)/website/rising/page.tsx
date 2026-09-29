'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { t } from '@reberon/contracts/text';
import { get } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { dateShort } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Empty, PageHeader, Pill, Skeleton, Status } from '@/components/ui/bits';

type Row = { id: string; title: Record<string, string>; happenedOn: string; milestone: string | null; percentComplete: number | null; status: string; mediaIds: string[]; cover: { url: string } | null };

export default function RisingPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/progress'], queryFn: () => get<Row[]>('/progress') });
  const can = useCan();
  const latest = data?.find((u) => u.percentComplete !== null);
  return (
    <div className="fade-in">
      <PageHeader
        title="Hotel rising"
        description="Construction as it is. Post from the site with a phone: a title, photos, two lines."
        actions={can('content:write') && <Button variant="primary" href="/website/rising/new" icon={<Plus className="size-4" />}>Post an update</Button>}
      />
      {latest && (
        <div className="card mb-5 flex items-center gap-5 p-5">
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${latest.percentComplete}%`, background: 'var(--series)' }} />
          </div>
          <p className="text-[13px]"><span className="text-[1.4rem] font-semibold tabular">{latest.percentComplete}%</span> built · last update {dateShort(latest.happenedOn)}</p>
        </div>
      )}
      <div className="card overflow-hidden">
        {isLoading && <Skeleton className="m-4 h-40" />}
        {!isLoading && !data?.length && <Empty title="No updates yet" body="The first photo of red soil and a spade is worth posting." />}
        <ol className="divide-y divide-line">
          {data?.map((u) => (
            <li key={u.id}>
              <Link href={`/website/rising/${u.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/60">
                <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">{u.cover && <img src={u.cover.url.replace(/\d+\.webp$/, '320.webp')} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t(u.title)}</span>
                  <span className="text-[12.5px] text-fg-muted">{dateShort(u.happenedOn)} · {u.mediaIds.length} photos{u.percentComplete !== null && ` · ${u.percentComplete}% built`}</span>
                </span>
                {u.milestone && <Pill tone="green">{u.milestone.toLowerCase()}</Pill>}
                <Status value={u.status} />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
