'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, MessageSquareText, RotateCcw, Send, Smartphone } from 'lucide-react';
import { TEMPLATES, fillTemplate, smsParts, type MessageChannel, type MessageTemplateDTO, type OutboundMessageDTO } from '@reberon/contracts';
import { ApiError, get, post, put } from '@/lib/api';
import { useCan, useMe } from '@/lib/providers';
import { ago } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Pill, Skeleton } from '@/components/ui/bits';
import { Switch, TextArea, TextInput } from '@/components/ui/field';
import { useConfirm } from '@/components/ui/confirm';

const CH: Record<MessageChannel, { label: string; icon: typeof Mail }> = { EMAIL: { label: 'Email', icon: Mail }, SMS: { label: 'SMS', icon: Smartphone }, WHATSAPP: { label: 'WhatsApp', icon: MessageSquareText } };
type Status = { EMAIL: boolean; SMS: boolean; WHATSAPP: boolean };

export default function MessagesSettingsPage() {
  const { data } = useQuery({ queryKey: ['message-templates'], queryFn: () => get<MessageTemplateDTO[]>('/message-templates') });
  const status = useQuery({ queryKey: ['messaging-status'], queryFn: () => get<Status>('/messaging/status') });
  const [key, setKey] = useState(TEMPLATES[0]!.key);
  const def = TEMPLATES.find((t) => t.key === key)!;
  const [channel, setChannel] = useState<MessageChannel>(def.channels[0]!);
  useEffect(() => { if (!def.channels.includes(channel)) setChannel(def.channels[0]!); }, [def, channel]);
  const tpl = data?.find((t) => t.key === key && t.channel === channel);

  return (
    <div className="fade-in">
      <PageHeader title="Messages" description="The words guests receive by email, SMS and WhatsApp. Change them any time; {{fields}} are filled in for each guest when the message goes out." />
      <div className="grid items-start gap-5 xl:grid-cols-[18rem_1fr]">
        <nav className="card p-2" aria-label="Messages">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => setKey(t.key)} className={cn('flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition', key === t.key ? 'bg-surface-2' : 'hover:bg-surface-2/60')}>
              <span className="text-[13.5px] font-medium">{t.label}</span>
              <span className="mt-0.5 flex gap-1.5">{t.channels.map((c) => { const I = CH[c].icon; const off = data?.find((x) => x.key === t.key && x.channel === c)?.isActive === false; return <I key={c} className={cn('size-3.5', off ? 'text-fg-subtle/40' : 'text-fg-subtle')} aria-label={CH[c].label} />; })}</span>
            </button>
          ))}
        </nav>

        <div className="grid gap-4">
          <div className="card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-fg-subtle">When it goes out</p>
            <p className="mt-1 text-[14px]">{def.when}</p>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist">
              {def.channels.map((c) => {
                const I = CH[c].icon;
                return (
                  <button key={c} type="button" role="tab" aria-selected={channel === c} onClick={() => setChannel(c)} className={cn('flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-medium', channel === c ? 'border-fg bg-fg text-bg' : 'border-line-strong hover:border-fg/40')}>
                    <I className="size-4" /> {CH[c].label}
                    {status.data && !status.data[c] && <span className={cn('rounded-full px-1.5 text-[10.5px]', channel === c ? 'bg-bg/20' : 'bg-surface-2 text-fg-muted')}>not connected</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {!tpl ? <Skeleton className="h-96" /> : <Editor key={tpl.id + tpl.updatedAt} tpl={tpl} connected={status.data?.[channel] ?? true} />}
        </div>
      </div>
    </div>
  );
}

function Editor({ tpl, connected }: { tpl: MessageTemplateDTO; connected: boolean }) {
  const qc = useQueryClient();
  const can = useCan();
  const me = useMe();
  const confirm = useConfirm();
  const def = TEMPLATES.find((t) => t.key === tpl.key)!;
  const edit = can('settings:write');
  const [f, setF] = useState({ subject: tpl.subject ?? '', heading: tpl.heading ?? '', body: tpl.body, actionLabel: tpl.actionLabel ?? '', providerTemplate: tpl.providerTemplate ?? '', isActive: tpl.isActive });
  const [to, setTo] = useState(tpl.channel === 'EMAIL' ? me.email : '');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState<'subject' | 'heading' | 'body'>('body');
  const sample = useMemo(() => Object.fromEntries(def.vars.map((v) => [v.name, v.sample])), [def]);
  const dirty = f.subject !== (tpl.subject ?? '') || f.heading !== (tpl.heading ?? '') || f.body !== tpl.body || f.actionLabel !== (tpl.actionLabel ?? '') || f.providerTemplate !== (tpl.providerTemplate ?? '') || f.isActive !== tpl.isActive;
  const onDone = (d: MessageTemplateDTO[]) => { qc.setQueryData(['message-templates'], d); toast.success('Saved'); };
  const err = (e: unknown) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ? `${e.message}. ${e.errors[0].message}` : e.message) : 'Could not save');
  const save = useMutation({ mutationFn: () => put<MessageTemplateDTO[]>(`/message-templates/${tpl.id}`, { subject: f.subject || null, heading: f.heading || null, body: f.body, actionLabel: f.actionLabel || null, providerTemplate: f.providerTemplate || null, isActive: f.isActive }), onSuccess: onDone, onError: err });
  const reset = useMutation({ mutationFn: () => post<MessageTemplateDTO[]>(`/message-templates/${tpl.id}/reset`), onSuccess: onDone, onError: err });
  const test = useMutation({
    mutationFn: () => post<OutboundMessageDTO>(`/message-templates/${tpl.id}/test`, { to }),
    onSuccess: (m) => {
      if (m.status === 'SENT') toast.success(`Test sent to ${m.to}`);
      else if (m.status === 'NOT_CONNECTED') toast.message(`${CH[tpl.channel].label} is not connected yet — the test was written to Sent messages.`, { action: m.fallbackUrl ? { label: 'Open WhatsApp', onClick: () => window.open(m.fallbackUrl!, '_blank') } : undefined });
      else toast.error(m.error ?? 'Could not send');
    },
    onError: err,
  });

  const insert = (name: string) => {
    const token = `{{${name}}}`;
    if (focus === 'body' && bodyRef.current) {
      const el = bodyRef.current;
      const [a, b] = [el.selectionStart, el.selectionEnd];
      setF({ ...f, body: f.body.slice(0, a) + token + f.body.slice(b) });
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + token.length, a + token.length); });
    } else setF({ ...f, [focus]: `${f[focus]}${token}` });
  };
  const body = fillTemplate(f.body, sample);
  const parts = tpl.channel === 'SMS' ? smsParts(body) : null;

  return (
    <div className="grid items-start gap-4 2xl:grid-cols-[1fr_24rem]">
      <div className="card grid gap-4 p-5">
        {!connected && tpl.channel !== 'EMAIL' && <p className="rounded-xl bg-warning/10 px-3 py-2 text-[12.5px]">{CH[tpl.channel].label} is not connected yet. Until it is, each message is written to <b>Sent messages</b>{tpl.channel === 'WHATSAPP' ? ' with a one-tap link staff can use to send it from the hotel phone' : ''}.</p>}
        {tpl.channel === 'EMAIL' && (
          <>
            <TextInput label="Subject" value={f.subject} onFocus={() => setFocus('subject')} onChange={(e) => setF({ ...f, subject: e.target.value })} disabled={!edit} />
            <TextInput label="Heading" value={f.heading} onFocus={() => setFocus('heading')} onChange={(e) => setF({ ...f, heading: e.target.value })} disabled={!edit} />
          </>
        )}
        <TextArea ref={bodyRef} label="Message" rows={tpl.channel === 'EMAIL' ? 10 : 6} value={f.body} onFocus={() => setFocus('body')} onChange={(e) => setF({ ...f, body: e.target.value })} disabled={!edit} hint={tpl.channel === 'EMAIL' ? 'A blank line starts a new paragraph.' : undefined} />
        {parts && <p className={cn('-mt-2 text-[12px]', parts.parts > 2 ? 'text-warning' : 'text-fg-muted')}>{parts.chars} characters with sample values · {parts.parts} SMS part{parts.parts > 1 ? 's' : ''}{parts.unicode ? ' (special characters make parts shorter)' : ''}</p>}
        <div>
          <p className="label mb-1.5">Fields you can use — click to insert</p>
          <div className="flex flex-wrap gap-1.5">
            {def.vars.map((v) => <button key={v.name} type="button" disabled={!edit} onClick={() => insert(v.name)} title={`${v.label} — e.g. ${v.sample}`} className="rounded-full border border-line bg-surface-2/60 px-2.5 py-1 font-mono text-[11.5px] hover:border-fg/40">{`{{${v.name}}}`}</button>)}
          </div>
        </div>
        {tpl.channel === 'EMAIL' && <TextInput label="Button" value={f.actionLabel} onChange={(e) => setF({ ...f, actionLabel: e.target.value })} disabled={!edit} hint="Leave empty for no button." />}
        {tpl.channel === 'WHATSAPP' && <TextInput label="Approved template name at Meta" value={f.providerTemplate} onChange={(e) => setF({ ...f, providerTemplate: e.target.value })} disabled={!edit} placeholder="booking_confirmed" hint="WhatsApp only lets a business start a conversation with a template approved in WhatsApp Manager. Submit this text there with the fields as {{1}}, {{2}}… in the same order, then enter its name here." />}
        <Switch label="Send this message" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} disabled={!edit} />
        {edit && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button variant="dark" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>Save</Button>
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} loading={reset.isPending} onClick={async () => { if (await confirm({ title: 'Go back to the original words?', body: 'Your changes to this message are replaced.', confirm: 'Reset' })) reset.mutate(); }}>Original words</Button>
            <span className="ml-auto text-[12px] text-fg-subtle">Changed {ago(tpl.updatedAt)}</span>
          </div>
        )}
      </div>

      <aside className="grid gap-3 2xl:sticky 2xl:top-20">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-fg-subtle">Preview with sample values</p>
        {tpl.channel === 'EMAIL' ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-[#F4F1EA] text-[#121513]">
            <div className="border-b border-black/10 bg-white/70 px-4 py-2 text-[12px]"><b>{fillTemplate(f.subject, sample) || '(no subject)'}</b></div>
            <div className="p-5">
              <p className="font-serif text-[1.3rem] leading-snug">{fillTemplate(f.heading, sample)}</p>
              {body.split(/\n{2,}/).map((p, i) => <p key={i} className="mt-3 whitespace-pre-line text-[13px] leading-relaxed">{p}</p>)}
              {def.facts && <div className="mt-4 border-t border-black/10 text-[12px]">{[['Booking', sample.code], ['Arrive', sample.arrival], ['Room', sample.room]].map(([k, v]) => <div key={k} className="flex border-b border-black/5 py-1.5"><span className="w-24 text-black/50">{k}</span>{v}</div>)}</div>}
              {f.actionLabel && <span className="mt-4 inline-block rounded-full bg-[#9E2A2B] px-4 py-2 text-[12.5px] font-semibold text-white">{f.actionLabel}</span>}
            </div>
          </div>
        ) : (
          <div className={cn('rounded-[1.6rem] border-[6px] border-fg/85 p-3', tpl.channel === 'WHATSAPP' ? 'bg-[#E9E1D6]' : 'bg-surface-2')}>
            <div className={cn('ml-auto max-w-[92%] whitespace-pre-line rounded-2xl rounded-tr-sm px-3 py-2 text-[13px] leading-relaxed shadow-sm', tpl.channel === 'WHATSAPP' ? 'bg-[#D9FDD3] text-[#111B21]' : 'bg-surface text-fg')}>{body}</div>
          </div>
        )}
        {edit && (
          <div className="card grid gap-2 p-4">
            <TextInput label={tpl.channel === 'EMAIL' ? 'Send a test to' : 'Send a test to (phone)'} value={to} onChange={(e) => setTo(e.target.value)} placeholder={tpl.channel === 'EMAIL' ? 'you@example.com' : '07xx xxx xxx'} />
            <Button icon={<Send className="size-4" />} loading={test.isPending} disabled={!to || dirty} onClick={() => test.mutate()}>{dirty ? 'Save first to test' : 'Send test'}</Button>
            <Pill className="justify-self-start">{def.key}</Pill>
          </div>
        )}
      </aside>
    </div>
  );
}
