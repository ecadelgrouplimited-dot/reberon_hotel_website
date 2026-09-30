'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import type { OutboundMessageDTO } from '@reberon/contracts';
import { get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Empty, PageHeader, Skeleton, Tabs } from '@/components/ui/bits';
import { MessageRow } from '@/components/messages/message-row';

export default function SentMessagesPage() {
  const qc = useQueryClient();
  const can = useCan();
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['outbox', status], queryFn: () => get<OutboundMessageDTO[]>(`/messages${status ? `?status=${status}` : ''}`), refetchInterval: 15_000 });
  const retry = useMutation({
    mutationFn: (id: string) => post<OutboundMessageDTO>(`/messages/${id}/retry`),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ['outbox'] }); m.status === 'SENT' ? toast.success('Sent') : toast.message(m.error ?? 'Still not sent'); },
  });
  return (
    <div className="fade-in">
      <PageHeader title="Sent messages" description="Every email, SMS and WhatsApp the house sent a guest — or would have, if the channel were connected. Nothing is lost while a provider is being set up." />
      <div className="card overflow-hidden">
        <Tabs className="px-3" value={status} onChange={setStatus} items={[{ value: '', label: 'Everything' }, { value: 'NOT_CONNECTED', label: 'Waiting for a person' }, { value: 'FAILED', label: 'Failed' }, { value: 'SENT', label: 'Sent' }]} />
        <ul className="divide-y divide-line">
          {isLoading && Array.from({ length: 5 }, (_, i) => <li key={i} className="p-4"><Skeleton className="h-6" /></li>)}
          {data?.map((m) => <MessageRow key={m.id} m={m} onRetry={can('bookings:write') ? () => retry.mutate(m.id) : undefined} />)}
        </ul>
        {data && !data.length && <Empty icon={<Mail className="size-5" />} title="Nothing here" body="Messages appear as bookings are confirmed, guests arrive and leave." />}
      </div>
    </div>
  );
}
