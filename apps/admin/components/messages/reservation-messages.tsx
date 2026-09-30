'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { TEMPLATES, type MessageChannel, type OutboundMessageDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { cn } from '@/lib/cn';
import { Button, buttonClass } from '@/components/ui/button';
import { Section } from '@/components/ui/bits';
import { Dialog } from '@/components/ui/dialog';
import { CHANNEL_ICON, MessageRow } from './message-row';

const CH_LABEL: Record<MessageChannel, string> = { EMAIL: 'Email', SMS: 'SMS', WHATSAPP: 'WhatsApp' };
const DESK_TEMPLATES = TEMPLATES.filter((t) => t.key !== 'stay.otp');

/** What the guest has been sent about this booking, and a way to send more. */
export function ReservationMessages({ reservationId, hasEmail, hasPhone }: { reservationId: string; hasEmail: boolean; hasPhone: boolean }) {
  const qc = useQueryClient();
  const can = useCan();
  const [open, setOpen] = useState(false);
  const list = useQuery({ queryKey: ['outbox', 'reservation', reservationId], queryFn: () => get<OutboundMessageDTO[]>(`/messages?reservationId=${reservationId}`), enabled: can('messages:read') });
  const retry = useMutation({ mutationFn: (id: string) => post(`/messages/${id}/retry`), onSuccess: () => qc.invalidateQueries({ queryKey: ['outbox'] }) });
  if (!can('messages:read')) return null;
  return (
    <Section title="Messages" description="Everything the guest was sent about this booking." actions={can('bookings:write') && <Button size="sm" icon={<Send className="size-3.5" />} onClick={() => setOpen(true)}>Send a message</Button>}>
      {!list.data?.length ? <p className="text-[13px] text-fg-muted">Nothing sent yet.</p> : (
        <ul className="-my-2 divide-y divide-line">{list.data.map((m) => <MessageRow key={m.id} m={m} compact onRetry={can('bookings:write') ? () => retry.mutate(m.id) : undefined} />)}</ul>
      )}
      <SendDialog open={open} onClose={() => setOpen(false)} reservationId={reservationId} hasEmail={hasEmail} hasPhone={hasPhone} />
    </Section>
  );
}

function SendDialog({ open, onClose, reservationId, hasEmail, hasPhone }: { open: boolean; onClose: () => void; reservationId: string; hasEmail: boolean; hasPhone: boolean }) {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['messaging-status'], queryFn: () => get<Record<MessageChannel, boolean>>('/messaging/status'), enabled: open });
  const [key, setKey] = useState('stay.running_late');
  const def = DESK_TEMPLATES.find((t) => t.key === key)!;
  const usable = def.channels.filter((c) => (c === 'EMAIL' ? hasEmail : hasPhone));
  const [channel, setChannel] = useState<MessageChannel>('WHATSAPP');
  const ch = usable.includes(channel) ? channel : usable[0];
  const [result, setResult] = useState<OutboundMessageDTO | null>(null);
  const send = useMutation({
    mutationFn: () => post<OutboundMessageDTO>(`/reservations/${reservationId}/messages`, { templateKey: key, channel: ch }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['outbox'] });
      if (m.status === 'SENT') { toast.success(`Sent by ${CH_LABEL[m.channel]}`); close(); }
      else setResult(m);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send'),
  });
  const close = () => { setResult(null); onClose(); };
  return (
    <Dialog open={open} onClose={close} title="Send a message" description="The words come from Settings → Messages, filled in for this guest."
      footer={result ? <Button onClick={close}>Done</Button> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" icon={<Send className="size-4" />} loading={send.isPending} disabled={!ch} onClick={() => send.mutate()}>Send</Button></>}>
      {result ? (
        <div className="grid gap-3 text-[13px]">
          {result.status === 'NOT_CONNECTED' ? (
            <>
              <p>{CH_LABEL[result.channel]} is not connected yet, so the message was written down but not sent.</p>
              {result.fallbackUrl && <a href={result.fallbackUrl} target="_blank" rel="noreferrer" className={buttonClass('primary', 'lg')} onClick={close}>Open WhatsApp with the message ready</a>}
            </>
          ) : <p className="text-danger">{result.error ?? 'It did not go through. It will be tried again automatically.'}</p>}
          <p className="whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2 text-[12.5px]">{result.body}</p>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-2">
            {DESK_TEMPLATES.map((t) => (
              <button key={t.key} type="button" onClick={() => setKey(t.key)} className={cn('rounded-xl border px-3 py-2.5 text-left transition', key === t.key ? 'border-fg bg-surface-2' : 'border-line hover:border-line-strong')}>
                <span className="block text-[13.5px] font-medium">{t.label}</span>
                <span className="text-[12px] text-fg-muted">{t.when}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Channel">
            {def.channels.map((c) => {
              const I = CHANNEL_ICON[c];
              const ok = c === 'EMAIL' ? hasEmail : hasPhone;
              return (
                <button key={c} type="button" role="radio" aria-checked={ch === c} disabled={!ok} onClick={() => setChannel(c)} className={cn('flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium disabled:opacity-40', ch === c ? 'border-fg bg-fg text-bg' : 'border-line-strong')}>
                  <I className="size-4" /> {CH_LABEL[c]}
                  {status.data && !status.data[c] && <span className="text-[10.5px] opacity-70">· by hand</span>}
                </button>
              );
            })}
          </div>
          {!ch && <p className="text-[12.5px] text-warning">This guest has no {def.channels.includes('EMAIL') ? 'email or phone' : 'phone number'} on file.</p>}
        </div>
      )}
    </Dialog>
  );
}
