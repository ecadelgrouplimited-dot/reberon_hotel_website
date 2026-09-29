'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import { t } from '@reberon/contracts/text';
import { formatMoney } from '@reberon/utils';
import { get } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { PageHeader, Skeleton, Status } from '@/components/ui/bits';
import { SortableCards } from '@/components/content/sortable-cards';
import { AmenitiesDialog } from '@/components/content/amenities-dialog';

type Row = { id: string; name: Record<string, string>; tagline: Record<string, string>; status: string; hero: { url: string } | null; roomCount: number; waitlistCount: number; sleepsAdults: number; sizeSqm: number | null; fromPriceUgx: string | null };

export default function RoomsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/room-types'], queryFn: () => get<Row[]>('/room-types') });
  const [amenities, setAmenities] = useState(false);
  const can = useCan();
  return (
    <div className="fade-in">
      <PageHeader
        title="Rooms"
        description="Each room type as a place. Drag to set the order guests see. Physical room numbers arrive with the desk (Movement IV)."
        actions={
          <>
            <Button icon={<Sparkles className="size-4" />} onClick={() => setAmenities(true)}>Amenities</Button>
            {can('content:write') && <Button variant="primary" href="/website/rooms/new" icon={<Plus className="size-4" />}>New room type</Button>}
          </>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : (
        <SortableCards
          queryKey={['/room-types']}
          reorderEndpoint="/room-types/reorder"
          items={(data ?? []).map((r) => ({
            id: r.id,
            href: `/website/rooms/${r.id}`,
            image: r.hero?.url.replace(/\d+\.webp$/, '640.webp'),
            title: t(r.name),
            subtitle: t(r.tagline),
            badges: <Status value={r.status} />,
            meta: (
              <>
                <span>{r.roomCount} rooms</span>
                <span>Sleeps {r.sleepsAdults}</span>
                {r.sizeSqm && <span>{r.sizeSqm} m²</span>}
                {r.fromPriceUgx && <span>from {formatMoney(r.fromPriceUgx, 'UGX')}</span>}
                <span className="font-medium text-fg-muted">{r.waitlistCount} on first-stay list</span>
              </>
            ),
          }))}
        />
      )}
      <AmenitiesDialog open={amenities} onClose={() => setAmenities(false)} />
    </div>
  );
}
