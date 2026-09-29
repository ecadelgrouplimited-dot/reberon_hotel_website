'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { ago } from '@/lib/format';
import { Button } from '@/components/ui/button';

type Status = { website: { ok: boolean; at: string; error?: string; failingSince?: string } | null };

/** Warns when saved changes are not reaching the website, with a one-click fix. */
export function WebsiteHealth() {
  const can = useCan();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['site-status'], queryFn: () => get<Status>('/site/status'), refetchInterval: 20_000, enabled: can('content:read') });
  const refresh = useMutation({
    mutationFn: () => post<Status>('/site/refresh'),
    onSuccess: (s) => {
      qc.setQueryData(['site-status'], s);
      if (s.website?.ok) toast.success('The website is up to date');
      else toast.error(`The website still is not responding: ${s.website?.error ?? 'unknown error'}`);
    },
  });
  const w = data?.website;
  if (!w || w.ok) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-[13px] sm:px-6">
      <TriangleAlert className="size-4 shrink-0 text-warning" />
      <p className="flex-1">
        <span className="font-semibold">The website is not picking up changes</span>
        <span className="text-fg-muted"> since {ago(w.failingSince ?? w.at)} ({w.error}). Your work is saved; it will appear once the website refreshes. Retrying automatically.</span>
      </p>
      {can('content:publish') && (
        <Button size="sm" variant="dark" icon={<RefreshCw className="size-3.5" />} loading={refresh.isPending} onClick={() => refresh.mutate()}>
          Refresh website now
        </Button>
      )}
    </div>
  );
}
