'use client';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { t } from '@reberon/contracts/text';
import { get } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { PageHeader, Pill, Skeleton, Status } from '@/components/ui/bits';
import { SortableCards } from '@/components/content/sortable-cards';

type Row = { id: string; name: Record<string, string>; tagline: Record<string, string>; status: string; kind: string; hero: { url: string } | null; stops: number };

export default function DestinationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/destinations'], queryFn: () => get<Row[]>('/destinations') });
  const can = useCan();
  return (
    <div className="fade-in">
      <PageHeader title="Kapchorwa" description="Sipi, Elgon, coffee, the road, getting here, when to come. Kapchorwa is why they drive." actions={can('content:write') && <Button variant="primary" href="/website/destinations/new" icon={<Plus className="size-4" />}>New story</Button>} />
      {isLoading ? <Skeleton className="h-72" /> : (
        <SortableCards
          queryKey={['/destinations']}
          reorderEndpoint="/destinations/reorder"
          items={(data ?? []).map((d) => ({
            id: d.id,
            href: `/website/destinations/${d.id}`,
            image: d.hero?.url.replace(/\d+\.webp$/, '640.webp'),
            title: t(d.name),
            subtitle: t(d.tagline),
            badges: <><Pill>{d.kind.toLowerCase()}</Pill><Status value={d.status} /></>,
            meta: d.stops ? <span>{d.stops} stops on the route</span> : undefined,
          }))}
        />
      )}
    </div>
  );
}
