'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Copy, KeyRound, Lock, UserPlus, UserRound } from 'lucide-react';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, type Role, type UserDTO } from '@reberon/contracts';
import { ApiError, get, post } from '@/lib/api';
import { ago } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PageHeader, Pill, Skeleton, Tabs } from '@/components/ui/bits';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput, Switch, TextInput } from '@/components/ui/field';
import { ROLE_LABEL } from '@/components/people/access-matrix';

function accessSummary(u: UserDTO) {
  const preset = ROLE_PERMISSIONS[u.role];
  const added = u.permissions.filter((p) => !(preset as string[]).includes(p)).length;
  const removed = (preset as string[]).filter((p) => !u.permissions.includes(p)).length;
  return { added, removed };
}

export default function PeoplePage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => get<UserDTO[]>('/users') });
  const [tab, setTab] = useState('all');
  const [adding, setAdding] = useState(false);
  const rows = (data ?? []).filter((u) => (tab === 'signin' ? u.canSignIn : tab === 'records' ? !u.canSignIn : tab === 'off' ? u.status === 'DISABLED' : u.status !== 'DISABLED'));
  const counts = { signin: data?.filter((u) => u.canSignIn && u.status !== 'DISABLED').length ?? 0, records: data?.filter((u) => !u.canSignIn && u.status !== 'DISABLED').length ?? 0, off: data?.filter((u) => u.status === 'DISABLED').length ?? 0 };

  return (
    <div className="fade-in">
      <PageHeader
        title="People and access"
        description="Everyone who works at the hotel. Not everyone needs to sign in: a cleaner or a guard can be on the list — given rooms to clean, named on the rota — without a login. For those who do sign in, the role is a starting point; open a person to add or take away single permissions, limit their hours, or end their access on a date."
        actions={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>Add someone</Button>}
      />
      <div className="card overflow-hidden">
        <Tabs className="px-3" value={tab} onChange={setTab} items={[{ value: 'all', label: 'Everyone' }, { value: 'signin', label: 'Sign in', count: counts.signin }, { value: 'records', label: 'No sign-in', count: counts.records }, { value: 'off', label: 'Switched off', count: counts.off }]} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-surface-2/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">
              <tr><th className="px-4 py-2.5">Person</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Access</th><th className="px-4 py-2.5">Last in</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>)}
              {rows.map((u) => {
                const s = accessSummary(u);
                const expired = u.accessExpiresAt && new Date(u.accessExpiresAt) < new Date();
                return (
                  <tr key={u.id} className={cn('cursor-pointer hover:bg-surface-2/50', u.status === 'DISABLED' && 'opacity-55')} onClick={() => router.push(`/settings/users/${u.id}`)}>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium"><span className="grid size-8 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">{u.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>{u.name}</p>
                      <p className="ml-10 text-[12px] text-fg-muted">{[u.jobTitle, u.email ?? u.phone].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {u.status === 'DISABLED' ? <Pill>Switched off</Pill> : !u.canSignIn ? <Pill><UserRound className="size-3" /> No sign-in</Pill> : u.status === 'INVITED' ? <Pill tone="blue">Invited</Pill> : <Pill tone="green" dot>Signs in</Pill>}
                        {u.role !== 'OWNER' && (s.added > 0 || s.removed > 0) && <Pill tone="amber"><KeyRound className="size-3" /> {s.added ? `+${s.added}` : ''}{s.added && s.removed ? ' ' : ''}{s.removed ? `−${s.removed}` : ''}</Pill>}
                        {u.signInFrom && <Pill><Clock className="size-3" /> {u.signInFrom}–{u.signInUntil}</Pill>}
                        {u.accessExpiresAt && <Pill tone={expired ? 'red' : 'neutral'}><Lock className="size-3" /> {expired ? 'Ended' : 'Until'} {new Date(u.accessExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Pill>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{u.canSignIn ? (u.lastLoginAt ? ago(u.lastLoginAt) : 'Never') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-fg-subtle">The API enforces every wall; the screens only hide what a person cannot use. Changes apply on their next click — no need for them to sign out.</p>
      <AddDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [f, setF] = useState({ name: '', jobTitle: '', phone: '', email: '', role: 'DESK' as Role, canSignIn: true });
  const [link, setLink] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => post<{ user: UserDTO; inviteUrl?: string }>('/users', { ...f, email: f.email || undefined, jobTitle: f.jobTitle || undefined, phone: f.phone || undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(f.canSignIn ? `Invitation sent to ${f.email}` : `${f.name} is on the staff list`);
      if (r.inviteUrl) setLink(r.inviteUrl);
      else { close(); router.push(`/settings/users/${r.user.id}`); }
    },
    onError: (e) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : 'Could not add'),
  });
  const close = () => { setF({ name: '', jobTitle: '', phone: '', email: '', role: 'DESK', canSignIn: true }); setLink(null); onClose(); };
  return (
    <Dialog open={open} onClose={close} title="Add someone" description="Anyone who works here. They only get a login if they need one."
      footer={link ? <Button onClick={close}>Done</Button> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" loading={m.isPending} disabled={f.name.trim().length < 2 || (f.canSignIn && !f.email)} onClick={() => m.mutate()}>{f.canSignIn ? 'Add and send invitation' : 'Add to the staff list'}</Button></>}>
      {link ? (
        <div className="grid gap-3 text-[13px]">
          <p>The invitation email is on its way. In development you can open it directly:</p>
          <button type="button" className="flex items-center gap-2 break-all rounded-xl bg-surface-2 px-3 py-2 text-left font-mono text-[12px]" onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied'); }}><Copy className="size-4 shrink-0" /> {link}</button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <TextInput label="Job title" value={f.jobTitle} onChange={(e) => setF({ ...f, jobTitle: e.target.value })} placeholder="Receptionist, housekeeper…" />
            <TextInput label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <SelectInput label="Role (starting access)" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</SelectInput>
          </div>
          <p className="-mt-2 text-[12.5px] text-fg-muted">{ROLE_DESCRIPTIONS[f.role]}</p>
          <Switch label="Signs in to the House" hint={f.canSignIn ? 'They get an email to choose a password.' : 'A staff record only: can be given rooms to clean and named on rotas, but cannot sign in.'} checked={f.canSignIn} onChange={(v) => setF({ ...f, canSignIn: v })} />
          {f.canSignIn && <TextInput label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
          {!f.canSignIn && <TextInput label="Email (optional)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
          <p className="text-[12px] text-fg-subtle">After adding, open the person to fine-tune what they can do.</p>
        </div>
      )}
    </Dialog>
  );
}
