'use client';
import { useCallback, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ImagePlus, Search, Upload } from 'lucide-react';
import type { AdminMediaDTO } from '@reberon/contracts';
import { t } from '@reberon/contracts/text';
import { api, get, thumb } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/bits';

type Page = { data: AdminMediaDTO[]; nextCursor: string | null; total: number; folders: { name: string | null; count: number }[] };

export function useUpload(folder?: string) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(0);
  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      setBusy((b) => b + list.length);
      const done: AdminMediaDTO[] = [];
      await Promise.all(
        list.map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          if (folder) fd.append('folder', folder);
          fd.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
          try {
            done.push(await api<AdminMediaDTO>('/media', { method: 'POST', body: fd }));
          } catch (e) {
            toast.error(`${file.name}: ${(e as Error).message}`);
          } finally {
            setBusy((b) => b - 1);
          }
        }),
      );
      if (done.length) {
        toast.success(`${done.length} file${done.length > 1 ? 's' : ''} uploaded — processing sizes…`);
        qc.invalidateQueries({ queryKey: ['media'] });
        setTimeout(() => qc.invalidateQueries({ queryKey: ['media'] }), 3000);
      }
      return done;
    },
    [folder, qc],
  );
  return { upload, busy };
}

export function MediaPicker({ open, onClose, onPick, multiple, initial = [] }: { open: boolean; onClose: () => void; onPick: (ids: string[]) => void; multiple?: boolean; initial?: string[] }) {
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('');
  const [selected, setSelected] = useState<string[]>(initial);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUpload(folder || undefined);
  const qs = new URLSearchParams({ limit: '48', kind: 'IMAGE', ...(q ? { q } : {}), ...(folder ? { folder } : {}) });
  const media = useInfiniteQuery({
    queryKey: ['media', 'picker', qs.toString()],
    queryFn: ({ pageParam }) => get<Page>(`/media?${qs}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (p) => p.nextCursor,
    enabled: open,
  });
  const items = media.data?.pages.flatMap((p) => p.data) ?? [];
  const folders = media.data?.pages[0]?.folders ?? [];

  const toggle = (id: string) => {
    if (!multiple) return setSelected([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={multiple ? 'Choose images' : 'Choose an image'}
      description="Placeholders and drawings are marked; real photographs replace them as the house is finished."
      footer={
        <>
          <span className="mr-auto text-[12.5px] text-fg-muted">{selected.length ? `${selected.length} selected` : 'Nothing selected'}</span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!selected.length && !multiple}
            onClick={() => {
              onPick(selected);
              onClose();
            }}
          >
            Use {multiple ? 'these' : 'this'}
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          const up = await upload(e.dataTransfer.files);
          if (up.length) setSelected((s) => (multiple ? [...s, ...up.map((u) => u.id)] : [up[0]!.id]));
        }}
        className={cn('relative', drag && 'after:absolute after:inset-0 after:rounded-2xl after:border-2 after:border-dashed after:border-brand after:bg-brand/5')}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input className="input pl-9" placeholder="Search by name, alt text or tag" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="input !w-auto" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder">
            <option value="">All folders</option>
            {folders.filter((f) => f.name).map((f) => (
              <option key={f.name} value={f.name!}>{f.name} ({f.count})</option>
            ))}
          </select>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={async (e) => {
            if (!e.target.files) return;
            const up = await upload(e.target.files);
            if (up.length) setSelected((s) => (multiple ? [...s, ...up.map((u) => u.id)] : [up[0]!.id]));
            e.target.value = '';
          }} />
          <Button icon={<Upload className="size-4" />} loading={busy > 0} onClick={() => file.current?.click()}>
            {busy ? `Uploading ${busy}…` : 'Upload'}
          </Button>
        </div>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {media.isLoading && Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}
          {items.map((m) => {
            const idx = selected.indexOf(m.id);
            return (
              <li key={m.id}>
                <button type="button" onClick={() => toggle(m.id)} className={cn('group relative block aspect-square w-full overflow-hidden rounded-xl ring-offset-2 ring-offset-surface transition', idx >= 0 ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-line-strong')} style={{ background: m.dominantColor ?? undefined }} title={t(m.alt)}>
                  {m.status === 'READY' ? <img src={thumb(m.id, 320)} alt={t(m.alt)} className="size-full object-cover" loading="lazy" /> : <span className="grid size-full place-items-center text-[11px] text-fg-subtle">Processing…</span>}
                  {idx >= 0 && (
                    <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">
                      {multiple ? idx + 1 : <Check className="size-3.5" />}
                    </span>
                  )}
                  {m.isRendering && <span className="absolute bottom-1.5 left-1.5 rounded bg-basalt-950/70 px-1.5 text-[10px] font-semibold uppercase text-white">Drawing</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {!media.isLoading && !items.length && (
          <div className="grid place-items-center py-16 text-center text-fg-muted">
            <ImagePlus className="mb-3 size-8 text-fg-subtle" />
            Drop photos here, or use Upload.
          </div>
        )}
        {media.hasNextPage && (
          <div className="mt-4 text-center">
            <Button size="sm" loading={media.isFetchingNextPage} onClick={() => media.fetchNextPage()}>Load more</Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
