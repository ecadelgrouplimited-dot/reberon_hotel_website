'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, UserPlus } from 'lucide-react';
import { ROLES, ROLE_DESCRIPTIONS, type Role, type UserDTO } from '@reberon/contracts';
import { ApiError, get, patch, post } from '@/lib/api';
import { useMe } from '@/lib/providers';
import { ago } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Status } from '@/components/ui/bits';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput, TextInput } from '@/components/ui/field';
import { useConfirm } from '@/components/ui/confirm';

const ROLE_LABEL: Record<Role, string> = { OWNER: 'Owner', MANAGER: 'Manager', DESK: 'Desk', HOUSEKEEPING: 'Housekeeping' };

export default function UsersPage() {
  const qc = useQueryClient();
  const me = useMe();
  const confirm = useConfirm();
  const { data } = useQuery({ queryKey: ['users'], queryFn: () => get<UserDTO[]>('/users') });
  const [inviting, setInviting] = useState(false);
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patch(`/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Updated'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update'),
  });
  return (
    <div className="fade-in">
      <PageHeader title="People" description="Who can sign in to the House, and what they can touch. The API enforces these walls; the screens only hide what a role cannot use." actions={<Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setInviting(true)}>Invite someone</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-2/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">
              <tr><th className="px-4 py-2.5">Person</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th><th className="hidden px-4 py-2.5 md:table-cell">Last sign-in</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><span className="block font-medium">{u.name}{u.id === me.id && <span className="ml-1.5 text-fg-subtle">(you)</span>}</span><span className="text-[12px] text-fg-subtle">{u.email}</span></td>
                  <td className="px-4 py-3">
                    <select className="input !min-h-8 !w-auto !py-1" value={u.role} disabled={u.id === me.id} onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })} aria-label={`Role for ${u.name}`}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><Status value={u.status} /></td>
                  <td className="hidden px-4 py-3 text-fg-muted md:table-cell">{u.lastLoginAt ? ago(u.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me.id && u.status !== 'INVITED' && (
                      <Button size="sm" variant={u.status === 'ACTIVE' ? 'ghost' : 'secondary'} onClick={async () => {
                        const disabling = u.status === 'ACTIVE';
                        if (disabling && !(await confirm({ title: `Disable ${u.name}?`, body: 'They are signed out everywhere at once and cannot sign in again until re-enabled.', confirm: 'Disable', danger: true }))) return;
                        update.mutate({ id: u.id, body: { status: disabling ? 'DISABLED' : 'ACTIVE' } });
                      }}>{u.status === 'ACTIVE' ? 'Disable' : 'Enable'}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Section title="Who may touch what">
          <dl className="grid gap-3 text-[13px]">
            {ROLES.map((r) => (
              <div key={r}><dt className="font-semibold">{ROLE_LABEL[r]}</dt><dd className="text-fg-muted">{ROLE_DESCRIPTIONS[r]}</dd></div>
            ))}
          </dl>
        </Section>
      </div>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', email: '', role: 'DESK' });
  const [link, setLink] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: () => post<{ inviteUrl?: string }>('/users/invite', f),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success(`Invitation emailed to ${f.email}`); setLink(r.inviteUrl ?? null); },
    onError: (e) => toast.error(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : 'Could not invite'),
  });
  const close = () => { setLink(null); setF({ name: '', email: '', role: 'DESK' }); onClose(); };
  return (
    <Dialog open={open} onClose={close} title="Invite someone" description="They get an email with a link to choose a password (valid seven days)."
      footer={link ? <Button variant="primary" onClick={close}>Done</Button> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" loading={invite.isPending} onClick={() => invite.mutate()}>Send invitation</Button></>}>
      {link ? (
        <div className="grid gap-3 text-[13px]">
          <p>Sent. In development you can also copy the link:</p>
          <div className="flex gap-2"><input className="input font-mono text-[11.5px]" readOnly value={link} /><Button icon={<Copy className="size-4" />} onClick={() => navigator.clipboard.writeText(link)}>Copy</Button></div>
        </div>
      ) : (
        <div className="grid gap-4">
          <TextInput label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <TextInput label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <SelectInput label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} hint={ROLE_DESCRIPTIONS[f.role as Role]}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </SelectInput>
        </div>
      )}
    </Dialog>
  );
}
