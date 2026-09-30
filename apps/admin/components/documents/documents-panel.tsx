'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, FileText, Mail, MessageSquareText, Printer, Receipt, Smartphone } from 'lucide-react';
import { DOCUMENT_LABEL, type DocumentRegisterDTO, type IssuedDocumentDTO, type OutboundMessageDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { money } from '@/lib/money';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, buttonClass } from '@/components/ui/button';
import { Pill, Section } from '@/components/ui/bits';
import { Dialog } from '@/components/ui/dialog';
import { Switch, TextInput } from '@/components/ui/field';

/** Open the printable page in a new tab and start printing. It counts as a print (the next one says COPY). */
export function printDocument(id: string, paper?: 'A4' | '80MM') {
  // Without a size, the hotel's default paper (Settings → Receipts and invoices) is used.
  window.open(`/v1/admin/documents/${id}/print?autoprint=1${paper ? `&paper=${paper}` : ''}`, '_blank', 'noopener');
}

export function DocumentActions({ d, compact, onChanged }: { d: IssuedDocumentDTO; compact?: boolean; onChanged?: () => void }) {
  const can = useCan();
  const qc = useQueryClient();
  const [voiding, setVoiding] = useState(false);
  const send = useMutation({
    mutationFn: (channel: 'EMAIL' | 'SMS' | 'WHATSAPP') => post<OutboundMessageDTO | null>(`/documents/${d.id}/send`, { channel }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['outbox'] });
      if (m?.status === 'NOT_CONNECTED' && m.fallbackUrl) toast.message('Not connected yet — send it from the hotel phone', { action: { label: 'Open WhatsApp', onClick: () => window.open(m.fallbackUrl!, '_blank') } });
      else if (m?.status === 'NOT_CONNECTED') toast.message('SMS is not connected yet; the message is in Sent messages.');
      else toast.success(`${DOCUMENT_LABEL[d.kind]} sent`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send'),
  });
  const valid = !d.voided;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" icon={<Printer className="size-3.5" />} onClick={() => { printDocument(d.id); setTimeout(() => qc.invalidateQueries({ queryKey: ['documents'] }), 1500); }}>Print</Button>
      <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => printDocument(d.id, '80MM')} title="80 mm receipt printer">80 mm</button>
      {valid && can('receipts:issue') && !compact && (
        <>
          <span className="flex items-center rounded-full border border-line" role="group" aria-label="Send to the guest">
            <Button size="icon" variant="ghost" className="!size-8" icon={<Mail className="size-3.5" />} loading={send.isPending && send.variables === 'EMAIL'} onClick={() => send.mutate('EMAIL')} aria-label="Email to the guest" title="Email to the guest" />
            <Button size="icon" variant="ghost" className="!size-8" icon={<MessageSquareText className="size-3.5" />} loading={send.isPending && send.variables === 'WHATSAPP'} onClick={() => send.mutate('WHATSAPP')} aria-label="WhatsApp to the guest" title="WhatsApp to the guest" />
            <Button size="icon" variant="ghost" className="!size-8" icon={<Smartphone className="size-3.5" />} loading={send.isPending && send.variables === 'SMS'} onClick={() => send.mutate('SMS')} aria-label="SMS to the guest" title="SMS to the guest" />
          </span>
        </>
      )}
      {valid && can('receipts:void') && <Button size="sm" variant="ghost" icon={<Ban className="size-3.5" />} onClick={() => setVoiding(true)}>Void</Button>}
      <VoidDialog d={d} open={voiding} onClose={() => setVoiding(false)} onDone={() => { setVoiding(false); qc.invalidateQueries({ queryKey: ['documents'] }); onChanged?.(); }} />
    </span>
  );
}

function VoidDialog({ d, open, onClose, onDone }: { d: IssuedDocumentDTO; open: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [reissue, setReissue] = useState(true);
  const [name, setName] = useState(d.issuedTo.name);
  const m = useMutation({
    mutationFn: () => post<{ voided: string; replacement: IssuedDocumentDTO | null }>(`/documents/${d.id}/void`, { reason, reissue, issuedToName: reissue && name !== d.issuedTo.name ? name : undefined }),
    onSuccess: (r) => { toast.success(r.replacement ? `${r.voided} voided — ${r.replacement.number} issued` : `${r.voided} voided`, r.replacement ? { action: { label: 'Print it', onClick: () => printDocument(r.replacement!.id) } } : undefined); onDone(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not void'),
  });
  return (
    <Dialog open={open} onClose={onClose} size="sm" title={`Void ${d.number}?`} description="The document stays on record, marked VOID with your reason. The payment itself is not touched — use a refund for that."
      footer={<><Button variant="ghost" onClick={onClose}>Keep it</Button><Button variant="danger" loading={m.isPending} disabled={reason.trim().length < 3} onClick={() => m.mutate()}>{reissue ? 'Void and reissue' : 'Void'}</Button></>}>
      <div className="grid gap-4">
        <TextInput label="Why" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Name spelled wrong, company name needed…" />
        <Switch label="Issue a corrected one" hint="Same amount, a new number, noting which one it replaces." checked={reissue} onChange={setReissue} />
        {reissue && <TextInput label="Issued to" value={name} onChange={(e) => setName(e.target.value)} hint="For example the company paying the bill." />}
      </div>
    </Dialog>
  );
}

export function DocumentRow({ d, showBooking, onChanged }: { d: IssuedDocumentDTO; showBooking?: boolean; onChanged?: () => void }) {
  const Icon = d.kind === 'INVOICE' ? FileText : Receipt;
  return (
    <li className={cn('grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 py-3 lg:grid-cols-[auto_1fr_8.5rem_auto]', d.voided && 'opacity-60')}>
      <Icon className="size-4 text-fg-subtle" aria-hidden />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-mono text-[12.5px] font-semibold">{d.number}{d.voided && <Pill tone="red">Void</Pill>}{d.printCount > 0 && <span className="font-sans text-[11px] font-normal text-fg-subtle">printed {d.printCount}×</span>}</span>
        <span className="text-[12px] text-fg-muted">{DOCUMENT_LABEL[d.kind]} · {d.issuedTo.name}{showBooking && d.reservation ? ` · ${d.reservation.code}` : ''} · {dateTime(d.issuedAt)}{d.issuedBy ? ` · ${d.issuedBy}` : ''}</span>
        {d.voided && <span className="block text-[12px] text-danger">Voided: {d.voided.reason}</span>}
        {d.replacesNumber && <span className="block text-[12px] text-fg-muted">Replaces {d.replacesNumber}</span>}
      </span>
      <span className={cn('text-right font-semibold tabular', d.kind === 'REFUND' && 'text-danger', d.voided && 'line-through')}>{d.kind === 'REFUND' ? '−' : ''}{money(d.amountMinor, d.currency)}</span>
      <span className="col-span-3 justify-self-end lg:col-span-1"><DocumentActions d={d} onChanged={onChanged} /></span>
    </li>
  );
}

/** On the reservation: what the guest has been given, and the bill as it stands. */
export function DocumentsPanel({ reservationId, status, onChanged }: { reservationId: string; status: string; onChanged?: () => void }) {
  const can = useCan();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['documents', 'reservation', reservationId], queryFn: () => get<DocumentRegisterDTO>(`/documents?reservationId=${reservationId}`), enabled: can('receipts:read') });
  const hasInvoice = data?.data.some((d) => d.kind === 'INVOICE' && !d.voided);
  const invoice = useMutation({
    mutationFn: () => post<IssuedDocumentDTO>(`/reservations/${reservationId}/invoice`),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success(`${d.number} issued`, { action: { label: 'Print', onClick: () => printDocument(d.id) } }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not issue'),
  });
  if (!can('receipts:read')) return null;
  return (
    <Section
      title="Receipts and invoices"
      description="Numbered and kept for ever. A mistake is voided and reissued, never edited."
      actions={
        <span className="flex gap-2">
          <Button size="sm" icon={<FileText className="size-3.5" />} onClick={() => window.open(`/v1/admin/reservations/${reservationId}/statement`, '_blank', 'noopener')}>Statement</Button>
          {can('receipts:issue') && !hasInvoice && ['IN_HOUSE', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'].includes(status) && <Button size="sm" variant="dark" loading={invoice.isPending} onClick={() => invoice.mutate()}>Issue invoice</Button>}
        </span>
      }
    >
      {!data?.data.length ? <p className="text-[13px] text-fg-muted">Nothing issued yet. Every payment gets a receipt automatically; the invoice comes at check-out.</p> : (
        <ul className="-my-3 divide-y divide-line">{data.data.map((d) => <DocumentRow key={d.id} d={d} onChanged={onChanged} />)}</ul>
      )}
    </Section>
  );
}
