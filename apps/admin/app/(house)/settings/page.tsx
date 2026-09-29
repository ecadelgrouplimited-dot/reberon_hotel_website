'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { ApiError, get, patch } from '@/lib/api';
import { useCan } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Skeleton } from '@/components/ui/bits';
import { FieldRenderer, type AdminFieldDef } from '@/components/forms/field-renderer';
import { FieldShell, Switch } from '@/components/ui/field';

type Settings = Record<string, { value: unknown; group: string }>;

const SECTIONS: { title: string; description: string; fields: AdminFieldDef[]; keys: string[] }[] = [
  {
    title: 'The hotel',
    description: 'Name, voice and the facts that appear across the website.',
    keys: ['hotel.name', 'hotel.tagline', 'hotel.openingLabel', 'hotel.footerNote', 'hotel.logoId'],
    fields: [
      { kind: 'group', label: '', fields: [{ kind: 'text', name: 'hotel.name', label: 'Hotel name', required: true }, { kind: 'ltext', name: 'hotel.openingLabel', label: 'Opening label', help: 'e.g. “Opening 2027”' }] },
      { kind: 'ltext', name: 'hotel.tagline', label: 'Tagline' },
      { kind: 'ltext', name: 'hotel.footerNote', label: 'Footer note' },
      { kind: 'media', name: 'hotel.logoId', label: 'Logo (optional)', help: 'Without a logo the site uses the Reberon wordmark.' },
    ],
  },
  {
    title: 'Contact',
    description: 'No treasure hunt: shown in the header, footer, contact page and every enquiry acknowledgement.',
    keys: ['contact.whatsapp', 'contact.email', 'contact.address', 'contact.hours', 'contact.responsePromise'],
    fields: [
      { kind: 'group', label: '', fields: [{ kind: 'text', name: 'contact.whatsapp', label: 'WhatsApp number', help: 'International format, e.g. +256 7…' }, { kind: 'text', name: 'contact.email', label: 'Email' }] },
      { kind: 'ltext', name: 'contact.address', label: 'Address' },
      { kind: 'group', label: '', fields: [{ kind: 'ltext', name: 'contact.hours', label: 'Hours' }, { kind: 'ltext', name: 'contact.responsePromise', label: 'Reply promise', help: 'Shown after a guest sends an enquiry.' }] },
    ],
  },
  {
    title: 'Stays',
    description: 'Times guests plan around.',
    keys: ['hotel.checkInTime', 'hotel.checkOutTime'],
    fields: [{ kind: 'group', label: '', fields: [{ kind: 'text', name: 'hotel.checkInTime', label: 'Check-in from', placeholder: '14:00' }, { kind: 'text', name: 'hotel.checkOutTime', label: 'Check-out by', placeholder: '10:30' }] }],
  },
  {
    title: 'Search & sharing defaults',
    description: 'Used when a page has not set its own.',
    keys: ['seo.defaultTitle', 'seo.titleTemplate', 'seo.defaultDescription', 'seo.shareImageId'],
    fields: [
      { kind: 'group', label: '', fields: [{ kind: 'text', name: 'seo.defaultTitle', label: 'Home page title' }, { kind: 'text', name: 'seo.titleTemplate', label: 'Title pattern', help: '%s is the page title' }] },
      { kind: 'ltext', name: 'seo.defaultDescription', label: 'Default description', multiline: true },
      { kind: 'media', name: 'seo.shareImageId', label: 'Default share image' },
    ],
  },
];

const LIST_KEYS = { 'contact.phones': 'Phone numbers', 'notifications.staffEmails': 'Staff who receive enquiry emails' } as const;
const FEATURES: [string, string, string][] = [
  ['features.waitlistEnabled', 'First-stay list', 'Show the first-stay form and “Claim a first stay” buttons.'],
  ['features.progressEnabled', 'Watch the hotel rise', 'Show construction progress on the website.'],
  ['features.bookingEnabled', 'Online booking', 'Movement II. Switches “Claim a first stay” to “Book”. Needs rates and payments first.'],
  ['features.toursEnabled', 'Virtual tours', 'Movement III. Shows “Walk this room” where a tour exists.'],
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => get<Settings>('/settings') });
  const [v, setV] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (data) setV(Object.fromEntries(Object.entries(data).map(([k, s]) => [k, s.value])));
  }, [data]);
  const original = data ? Object.fromEntries(Object.entries(data).map(([k, s]) => [k, s.value])) : {};
  const changed = Object.fromEntries(Object.entries(v).filter(([k, x]) => JSON.stringify(x) !== JSON.stringify(original[k])));
  const save = useMutation({
    mutationFn: () => patch<Settings>('/settings', changed),
    onSuccess: (d) => { qc.setQueryData(['settings'], d); toast.success('Settings saved — the website is updating'); },
    onError: (e) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : 'Could not save'),
  });
  if (!data) return <Skeleton className="h-96" />;
  const editable = can('settings:write');
  const n = Object.keys(changed).length;
  return (
    <div className="fade-in">
      <PageHeader
        title="Settings"
        description="How the hotel presents itself. Time zone is fixed to Africa/Kampala; currencies are UGX and USD, never converted."
        actions={editable && <Button variant="primary" disabled={!n} loading={save.isPending} onClick={() => save.mutate()}>{n ? `Save ${n} change${n > 1 ? 's' : ''}` : 'Saved'}</Button>}
      />
      <fieldset disabled={!editable} className="grid gap-5 xl:grid-cols-2">
        {SECTIONS.map((s) => (
          <Section key={s.title} title={s.title} description={s.description}>
            <FieldRenderer fields={s.fields} value={v} onChange={setV} />
          </Section>
        ))}
        <Section title="Lists" description="One per line.">
          <div className="grid gap-4">
            {Object.entries(LIST_KEYS).map(([k, label]) => (
              <FieldShell key={k} label={label}>
                <textarea className="input font-mono text-[12.5px]" rows={3} value={((v[k] as string[]) ?? []).join('\n')} onChange={(e) => setV({ ...v, [k]: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
              </FieldShell>
            ))}
          </div>
        </Section>
        <Section title="Features" description={can('settings:features') ? 'Switch parts of the website on as the hotel is ready for them.' : 'Only the owner can change these.'}>
          <div className="grid gap-5">
            {FEATURES.map(([k, label, hint]) => (
              <Switch key={k} label={<span className="flex items-center gap-1.5">{label}{!can('settings:features') && <Lock className="size-3" />}</span>} hint={hint} checked={!!v[k]} disabled={!can('settings:features')} onChange={(x) => setV({ ...v, [k]: x })} />
            ))}
          </div>
        </Section>
      </fieldset>
    </div>
  );
}
