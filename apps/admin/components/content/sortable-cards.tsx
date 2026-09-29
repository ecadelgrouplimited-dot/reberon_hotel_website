'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { cn } from '@/lib/cn';

export interface CardItem {
  id: string;
  href: string;
  image?: string | null;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
}

/** Card grid whose order is the website's order. Drag the handle to reorder. */
export function SortableCards({ items, reorderEndpoint, queryKey }: { items: CardItem[]; reorderEndpoint: string; queryKey: unknown[] }) {
  const [order, setOrder] = useState(items);
  const can = useCan();
  const qc = useQueryClient();
  useEffect(() => setOrder(items), [items]);
  const save = useMutation({
    mutationFn: (ids: string[]) => post(reorderEndpoint, { ids }),
    onSuccess: () => {
      toast.success('Order saved — the website follows it');
      qc.invalidateQueries({ queryKey });
    },
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.findIndex((i) => i.id === e.active.id), order.findIndex((i) => i.id === e.over!.id));
    setOrder(next);
    save.mutate(next.map((i) => i.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((i) => i.id)} strategy={rectSortingStrategy}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {order.map((item) => (
            <Card key={item.id} item={item} draggable={can('content:write')} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Card({ item, draggable }: { item: CardItem; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !draggable });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('card group relative overflow-hidden', isDragging && 'z-10 shadow-[var(--shadow-lift)]')}>
      <Link href={item.href} className="block">
        <div className="aspect-[16/9] bg-surface-2">{item.image && <img src={item.image} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />}</div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="display text-[1.2rem] leading-tight">{item.title}</h3>
            <span className="flex shrink-0 gap-1">{item.badges}</span>
          </div>
          {item.subtitle && <p className="mt-1 line-clamp-2 text-[12.5px] text-fg-muted">{item.subtitle}</p>}
          {item.meta && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-subtle">{item.meta}</div>}
        </div>
      </Link>
      {draggable && (
        <button type="button" className="absolute left-2 top-2 grid size-8 cursor-grab place-items-center rounded-full bg-surface/90 text-fg-muted opacity-0 shadow backdrop-blur transition group-hover:opacity-100 focus:opacity-100 active:cursor-grabbing" aria-label={`Reorder ${item.title}`} {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </button>
      )}
    </li>
  );
}
