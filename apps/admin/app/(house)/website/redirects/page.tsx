'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Trash2 } from 'lucide-react';
import { ApiError, del, get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { ago } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Empty, PageHeader, Section } from '@/components/ui/bits';

type R = { id: string; fromPath: string; toPath: string; statusCode: number; hits: number; createdAt: string };

export default function RedirectsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const { data } = useQuery({ queryKey: ['redirects'], queryFn: () => get<R[]>('/redirects') });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const add = useMutation({
    mutationFn: () => post('/redirects', { fromPath: from.startsWith('/') ? from : `/${from}`, toPath: to, statusCode: 301 }),
    onSuccess: () => { setFrom(''); setTo(''); qc.invalidateQueries({ queryKey: ['redirects'] }); toast.success('Redirect added'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add'),
  });
  const remove = useMutation({ mutationFn: (id: string) => del(`/redirects/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['redirects'] }) });
  return (
    <div className="fade-in">
      <PageHeader title="Redirects" description="Old addresses that should lead somewhere new. Added automatically when a published page changes its address." />
      {can('content:write') && (
        <Section className="mb-5" title="Add a redirect">
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <input className="input flex-1 font-mono text-[12.5px]" placeholder="/old-address" value={from} onChange={(e) => setFrom(e.target.value)} required />
            <ArrowRight className="size-4 text-fg-subtle" />
            <input className="input flex-1 font-mono text-[12.5px]" placeholder="/new-address or https://…" value={to} onChange={(e) => setTo(e.target.value)} required />
            <Button type="submit" variant="dark" loading={add.isPending}>Add</Button>
          </form>
        </Section>
      )}
      <div className="card overflow-hidden">
        {!data?.length ? <Empty title="No redirects" body="Nothing has moved yet." /> : (
          <ul className="divide-y divide-line">
            {data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 font-mono text-[12.5px]">
                <span className="truncate">{r.fromPath}</span>
                <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="truncate">{r.toPath}</span>
                <span className="ml-auto font-sans text-[12px] text-fg-subtle">{r.statusCode} · {ago(r.createdAt)}</span>
                {can('content:write') && <button type="button" onClick={() => remove.mutate(r.id)} aria-label="Remove" className="text-fg-subtle hover:text-danger"><Trash2 className="size-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
