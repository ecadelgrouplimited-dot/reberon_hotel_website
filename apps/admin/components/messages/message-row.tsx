'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquareText, RefreshCw, Send, Smartphone } from 'lucide-react';
import { TEMPLATES, type MessageChannel, type OutboundMessageDTO } from '@reberon/contracts';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, buttonClass } from '@/components/ui/button';
import { Pill, type Tone } from '@/components/ui/bits';

export const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = { EMAIL: Mail, SMS: Smartphone, WHATSAPP: MessageSquareText };
export const OUT_STATUS: Record<string, [string, Tone]> = { SENT: ['Sent', 'green'], QUEUED: ['Sending', 'blue'], FAILED: ['Failed', 'red'], NOT_CONNECTED: ['Not sent — not connected', 'amber'], SKIPPED: ['Skipped', 'neutral'] };
export const templateLabel = (k: string | null) => TEMPLATES.find((t) => t.key === k)?.label ?? k ?? 'Message';

export function MessageRow({ m, onRetry, compact }: { m: OutboundMessageDTO; onRetry?: () => void; compact?: boolean }) {
  const I = CHANNEL_ICON[m.channel];
  const [label, tone] = OUT_STATUS[m.status] ?? [m.status, 'neutral'];
  const [open, setOpen] = useState(false);
  return (
    <li className={cn('grid gap-2', compact ? 'py-2.5' : 'p-4')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <I className="size-4 text-fg-subtle" aria-label={m.channel} />
        <button type="button" onClick={() => setOpen(!open)} className="font-medium hover:underline">{m.subject?.startsWith('[TEST]') ? 'Test: ' : ''}{templateLabel(m.templateKey)}</button>
        <span className="text-fg-muted">to {m.to}</span>
        {!compact && m.reservation && <Link href={`/reservations/${m.reservation.id}`} className="font-mono text-[12px] text-fg-subtle hover:underline">{m.reservation.code}</Link>}
        {m.sentBy && <span className="text-[12px] text-fg-subtle">by {m.sentBy}</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-fg-subtle">{dateTime(m.sentAt ?? m.createdAt)}</span>
          <Pill tone={tone} dot>{label}</Pill>
        </span>
      </div>
      {(open || m.status === 'NOT_CONNECTED' || m.status === 'FAILED') && (
        <div className="ml-7 grid gap-2">
          {open && <p className="whitespace-pre-line rounded-xl bg-surface-2/70 px-3 py-2 text-[12.5px] leading-relaxed">{m.body}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {m.status === 'NOT_CONNECTED' && m.fallbackUrl && <a href={m.fallbackUrl} target="_blank" rel="noreferrer" className={buttonClass('primary', 'sm')}><Send className="size-3.5" /> Send from WhatsApp</a>}
            {m.error && m.status !== 'SENT' && <span className="text-[12px] text-fg-muted">{m.error}</span>}
            {onRetry && (m.status === 'FAILED' || m.status === 'NOT_CONNECTED') && <Button size="sm" icon={<RefreshCw className="size-3.5" />} onClick={onRetry}>Try again</Button>}
          </div>
        </div>
      )}
    </li>
  );
}
