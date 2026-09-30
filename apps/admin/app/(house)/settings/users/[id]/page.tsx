'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogOut, Mail, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { ROLES, ROLE_DESCRIPTIONS, type Role, type SessionDTO, type UserDTO } from '@reberon/contracts';
import { ApiError, get, patch, post } from '@/lib/api';
import { useMe } from '@/lib/providers';
import { ago, dateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, Pill, Section, Skeleton } from '@/components/ui/bits';
import { SelectInput, Switch, TextInput } from '@/components/ui/field';
import { useConfirm } from '@/components/ui/confirm';
import { AccessMatrix, ROLE_LABEL } from '@/components/people/access-matrix';

type Form = { name: string; jobTitle: string; phone: string; email: string; role: Role; canSignIn: boolean; hours: boolean; signInFrom: string; signInUntil: string; expires: string; grants: string[]; revokes: string[] };

const toForm = (u: UserDTO): Form => ({
  name: u.name, jobTitle: u.jobTitle ?? '', phone: u.phone ?? '', email: u.email ?? '', role: u.role, canSignIn: u.canSignIn,
  hours: !!u.signInFrom, signInFrom: u.signInFrom ?? '07:00', signInUntil: u.signInUntil ?? '19:00',
  expires: u.accessExpiresAt ? u.accessExpiresAt.slice(0, 10) : '', grants: u.grants, revokes: u.revokes,
});

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const me = useMe();
  const confirm = useConfirm();
  const { data: u } = useQuery({ queryKey: ['user', id], queryFn: () => get<UserDTO>(`/users/${id}`) });
  const sessions = useQuery({ queryKey: ['user-sessions', id], queryFn: () => get<SessionDTO[]>(`/users/${id}/sessions`), enabled: !!u?.canSignIn });
  const [f, setF] = useState<Form | null>(null);
  useEffect(() => { if (u) setF(toForm(u)); }, [u]);
  const self = id === me.id;

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name: f!.name, jobTitle: f!.jobTitle || null, phone: f!.phone || null, email: f!.email || null };
      if (!self) Object.assign(body, {
        role: f!.role, canSignIn: f!.canSignIn, grants: f!.grants, revokes: f!.revokes,
        signInFrom: f!.hours ? f!.signInFrom : null, signInUntil: f!.hours ? f!.signInUntil : null,
        // End of that day in Kampala.
        accessExpiresAt: f!.expires ? new Date(`${f!.expires}T23:59:00+03:00`).toISOString() : null,
      });
      return patch<UserDTO>(`/users/${id}`, body);
    },
    onSuccess: (d) => { qc.setQueryData(['user', id], d); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user-sessions', id] }); toast.success('Saved — it applies on their next click'); },
    onError: (e) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : 'Could not save'),
  });
  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'DISABLED') => patch<UserDTO>(`/users/${id}`, { status }),
    onSuccess: (d) => { qc.setQueryData(['user', id], d); qc.invalidateQueries({ queryKey: ['users'] }); toast.success(d.status === 'DISABLED' ? 'Switched off and signed out' : 'Switched back on'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not change'),
  });
  const invite = useMutation({
    mutationFn: () => post<{ inviteUrl?: string }>(`/users/${id}/invite`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['user', id] }); toast.success('Invitation sent', r.inviteUrl ? { description: r.inviteUrl, duration: 15000 } : undefined); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send'),
  });
  const signOut = useMutation({
    mutationFn: () => post<{ ended: number }>(`/users/${id}/sign-out`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['user-sessions', id] }); toast.success(`Signed out on ${r.ended} device${r.ended === 1 ? '' : 's'}`); },
  });

  if (!u || !f) return <Skeleton className="h-96" />;
  const dirty = JSON.stringify(f) !== JSON.stringify(toForm(u));
  const set = (p: Partial<Form>) => setF({ ...f, ...p });

  return (
    <div className="fade-in">
      <PageHeader
        crumbs={[{ label: 'People', href: '/settings/users' }, { label: u.name }]}
        title={<span className="flex flex-wrap items-center gap-3">{u.name}{u.status === 'DISABLED' ? <Pill>Switched off</Pill> : !u.canSignIn ? <Pill>No sign-in</Pill> : u.status === 'INVITED' ? <Pill tone="blue">Invited</Pill> : <Pill tone="green" dot>Signs in</Pill>}</span>}
        description={[u.jobTitle, ROLE_LABEL[u.role], u.canSignIn ? (u.lastLoginAt ? `last in ${ago(u.lastLoginAt)}` : 'never signed in') : null].filter(Boolean).join(' · ')}
        actions={
          <>
            {!self && (u.status === 'DISABLED'
              ? <Button onClick={() => setStatus.mutate('ACTIVE')}>Switch back on</Button>
              : <Button variant="danger" onClick={async () => { if (await confirm({ title: `Switch ${u.name} off?`, body: 'They are signed out at once and cannot sign in. Their name stays on past work.', confirm: 'Switch off', danger: true })) setStatus.mutate('DISABLED'); }}>Switch off</Button>)}
            <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>Save</Button>
          </>
        }
      />
      {self && <p className="mb-5 flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-[13px]"><ShieldCheck className="size-4" /> This is you. Another owner changes your access; you can edit your own details.</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_24rem]">
        <Section title="What they can do" description="The role sets the starting point. Switch single things on or off for this person.">
          <div className="mb-5 max-w-sm">
            <SelectInput label="Role" value={f.role} disabled={self} onChange={(e) => set({ role: e.target.value as Role, grants: [], revokes: [] })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</SelectInput>
            <p className="mt-1.5 text-[12.5px] text-fg-muted">{ROLE_DESCRIPTIONS[f.role]}{f.role !== u.role ? ' Changing the role clears this person’s own changes.' : ''}</p>
          </div>
          <AccessMatrix role={f.role} grants={f.grants} revokes={f.revokes} disabled={self} onChange={(n) => set(n)} />
        </Section>

        <aside className="grid gap-5 xl:sticky xl:top-20">
          <div className="card grid gap-4 p-5">
            <p className="font-semibold">Signing in</p>
            <Switch label="Signs in to the House" hint={f.canSignIn ? 'With an email and a password.' : 'A staff record only. They can be given rooms to clean and named on rotas.'} checked={f.canSignIn} disabled={self} onChange={(v) => set({ canSignIn: v })} />
            {f.canSignIn && (
              <>
                <Switch label="Only at certain hours" hint="Kampala time. Owners are never shut out." checked={f.hours} disabled={self || u.role === 'OWNER'} onChange={(v) => set({ hours: v })} />
                {f.hours && (
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput label="From" type="time" value={f.signInFrom} disabled={self} onChange={(e) => set({ signInFrom: e.target.value })} />
                    <TextInput label="Until" type="time" value={f.signInUntil} disabled={self} onChange={(e) => set({ signInUntil: e.target.value })} hint={f.signInUntil < f.signInFrom ? 'Runs past midnight' : undefined} />
                  </div>
                )}
                <TextInput label="Access ends on (optional)" type="date" value={f.expires} disabled={self} onChange={(e) => set({ expires: e.target.value })} hint="For relief or seasonal staff. They are shut out at the end of that day." />
                {u.email && (u.status === 'INVITED' || !u.hasPassword) && <Button icon={<Mail className="size-4" />} loading={invite.isPending} onClick={() => invite.mutate()}>{u.status === 'INVITED' ? 'Send the invitation again' : 'Send an invitation'}</Button>}
              </>
            )}
          </div>

          <div className="card grid gap-3 p-5">
            <p className="font-semibold">Details</p>
            <TextInput label="Name" value={f.name} onChange={(e) => set({ name: e.target.value })} />
            <TextInput label="Job title" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            <TextInput label="Phone" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
            <TextInput label={f.canSignIn ? 'Email (their sign-in)' : 'Email'} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </div>

          {u.canSignIn && (
            <div className="card grid gap-3 p-5 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">Signed in on</p>
                {!!sessions.data?.length && <Button size="sm" variant="danger" icon={<LogOut className="size-3.5" />} loading={signOut.isPending} onClick={async () => { if (await confirm({ title: `Sign ${u.name} out everywhere?`, body: 'Every device they use is signed out now. They can sign in again unless you also change their access.', confirm: 'Sign out everywhere' })) signOut.mutate(); }}>Sign out everywhere</Button>}
              </div>
              {!sessions.data?.length ? <p className="text-fg-muted">No devices right now.</p> : (
                <ul className="grid gap-2">
                  {sessions.data.map((s) => (
                    <li key={s.id} className="flex items-start gap-2.5"><MonitorSmartphone className="mt-0.5 size-4 text-fg-subtle" /><span><span className="block font-medium">{s.device}</span><span className="text-[12px] text-fg-muted">since {dateTime(s.createdAt)}{s.ip ? ` · ${s.ip}` : ''} · active {ago(s.lastUsedAt)}</span></span></li>
                  ))}
                </ul>
              )}
              <Link href={`/settings/audit?q=${encodeURIComponent(u.name)}`} className="text-[12.5px] font-medium text-fg-muted hover:text-fg">What they did (audit log) →</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
