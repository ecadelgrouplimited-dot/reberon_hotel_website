'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { AMENITY_CATEGORIES } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { slugify } from '@reberon/utils';
import { ApiError, del, get, patch, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';

type Amenity = { id: string; key: string; name: Record<string, string>; icon: string; category: string; usage: number };

export function AmenitiesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useCan();
  const confirm = useConfirm();
  const { data } = useQuery({ queryKey: ['amenities'], queryFn: () => get<Amenity[]>('/amenities'), enabled: open });
  const [name, setName] = useState('');
  const [category, setCategory] = useState('COMFORT');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['amenities'] });
    qc.invalidateQueries({ queryKey: ['entity-options', 'amenity'] });
  };
  const add = useMutation({
    mutationFn: () => post('/amenities', { key: slugify(name), name: { en: name }, icon: 'sparkles', category }),
    onSuccess: () => { setName(''); refresh(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add'),
  });
  const rename = useMutation({ mutationFn: ({ id, n }: { id: string; n: string }) => patch(`/amenities/${id}`, { name: { en: n } }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => del(`/amenities/${id}`), onSuccess: refresh });
  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Amenities" description="What a room can have. Pick them per room type; the site groups them by kind.">
      {can('content:write') && (
        <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }}>
          <input className="input flex-1" placeholder="e.g. Hot water bottle on request" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input !w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            {AMENITY_CATEGORIES.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
          </select>
          <Button type="submit" variant="dark" loading={add.isPending}>Add</Button>
        </form>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {AMENITY_CATEGORIES.map((c) => (
          <div key={c}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{c.toLowerCase()}</p>
            <ul className="grid gap-1">
              {data?.filter((a) => a.category === c).map((a) => (
                <li key={a.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2">
                  <input className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" defaultValue={t(a.name)} disabled={!can('content:write')} onBlur={(e) => e.target.value !== t(a.name) && rename.mutate({ id: a.id, n: e.target.value })} />
                  <span className="text-[11px] text-fg-subtle">{a.usage} rooms</span>
                  {can('content:write') && (
                    <button type="button" className="opacity-0 group-hover:opacity-100" aria-label={`Delete ${t(a.name)}`} onClick={async () => (await confirm({ title: `Delete “${t(a.name)}”?`, body: `It is used by ${a.usage} room type(s) and will disappear from them.`, confirm: 'Delete', danger: true })) && remove.mutate(a.id)}>
                      <Trash2 className="size-3.5 text-fg-subtle hover:text-danger" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
