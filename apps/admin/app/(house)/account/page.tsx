'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, post } from '@/lib/api';
import { useMe } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { PageHeader, Section } from '@/components/ui/bits';
import { TextInput } from '@/components/ui/field';

export default function AccountPage() {
  const me = useMe();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', again: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => post('/auth/password', { currentPassword: f.currentPassword, newPassword: f.newPassword }),
    onSuccess: () => { toast.success('Password changed'); setF({ currentPassword: '', newPassword: '', again: '' }); setErr({}); },
    onError: (e) => { if (e instanceof ApiError) setErr(e.fieldErrors()); toast.error(e instanceof ApiError ? e.message : 'Could not change'); },
  });
  return (
    <div className="fade-in max-w-xl">
      <PageHeader title="Your account" description={`${me.name} · ${me.email} · ${me.role.toLowerCase()}`} />
      <Section title="Change password">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (f.newPassword !== f.again) return setErr({ again: 'Does not match' }); m.mutate(); }}>
          <TextInput label="Current password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} error={err.currentPassword} />
          <TextInput label="New password" type="password" autoComplete="new-password" hint="At least 12 characters" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} error={err.newPassword} />
          <TextInput label="Repeat new password" type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} error={err.again} />
          <Button type="submit" variant="primary" className="justify-self-start" loading={m.isPending}>Change password</Button>
        </form>
      </Section>
    </div>
  );
}
