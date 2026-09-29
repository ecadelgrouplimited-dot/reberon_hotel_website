'use client';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { t } from '@reberon/contracts/text';
import { get, thumb } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { PageHeader, Skeleton, Status } from '@/components/ui/bits';
import { SortableCards } from '@/components/content/sortable-cards';

type Row = { id: string; name: Record<string, string>; summary: Record<string, string>; status: string; mediaIds: string[] };

export default function FacilitiesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/facilities'], queryFn: () => get<Row[]>('/facilities') });
  const can = useCan();
  return (
    <div className="fade-in">
      <PageHeader title="Facilities" description="Only what exists: restaurant, hall, parking, power, water. Mark things still being built honestly." actions={can('content:write') && <Button variant="primary" href="/website/facilities/new" icon={<Plus className="size-4" />}>New facility</Button>} />
      {isLoading ? <Skeleton className="h-72" /> : (
        <SortableCards
          queryKey={['/facilities']}
          reorderEndpoint="/facilities/reorder"
          items={(data ?? []).map((f) => ({ id: f.id, href: `/website/facilities/${f.id}`, image: f.mediaIds[0] ? thumb(f.mediaIds[0]) : null, title: t(f.name), subtitle: t(f.summary), badges: <Status value={f.status} /> }))}
        />
      )}
    </div>
  );
}
