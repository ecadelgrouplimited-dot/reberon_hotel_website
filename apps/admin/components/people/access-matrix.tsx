'use client';
import { Banknote, Lock, RotateCcw } from 'lucide-react';
import { OWNER_ONLY, PERMISSION_INFO, ROLE_PERMISSIONS, type Permission, type Role } from '@reberon/contracts';
import { cn } from '@/lib/cn';

export const ROLE_LABEL: Record<Role, string> = { OWNER: 'Owner', MANAGER: 'Manager', DESK: 'Front desk', HOUSEKEEPING: 'Housekeeping' };

/**
 * Every permission, grouped, with what the role gives shown as the default.
 * A switch that differs from the role is marked "added" or "removed".
 */
export function AccessMatrix({ role, grants, revokes, onChange, disabled }: { role: Role; grants: string[]; revokes: string[]; onChange: (next: { grants: string[]; revokes: string[] }) => void; disabled?: boolean }) {
  const preset = new Set<string>(ROLE_PERMISSIONS[role]);
  const isOwner = role === 'OWNER';
  const has = (p: Permission) => isOwner || (preset.has(p) ? !revokes.includes(p) : grants.includes(p));
  const toggle = (p: Permission) => {
    const on = has(p);
    if (preset.has(p)) onChange({ grants, revokes: on ? [...revokes, p] : revokes.filter((x) => x !== p) });
    else onChange({ grants: on ? grants.filter((x) => x !== p) : [...grants, p], revokes });
  };
  const groups = [...new Set(PERMISSION_INFO.map((p) => p.group))];
  const changed = grants.length + revokes.length > 0;

  return (
    <div className="grid gap-5">
      {isOwner && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px]">Owners can do everything. That cannot be narrowed — give someone the manager role instead if they need less.</p>}
      {!isOwner && changed && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-[13px]">
          <span>Different from the {ROLE_LABEL[role].toLowerCase()} role: {grants.length ? `${grants.length} added` : ''}{grants.length && revokes.length ? ', ' : ''}{revokes.length ? `${revokes.length} removed` : ''}.</span>
          {!disabled && <button type="button" className="flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" onClick={() => onChange({ grants: [], revokes: [] })}><RotateCcw className="size-3.5" /> Back to the role</button>}
        </p>
      )}
      {groups.map((g) => (
        <section key={g}>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-fg-subtle">{g}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {PERMISSION_INFO.filter((p) => p.group === g).map((p) => {
              const on = has(p.key);
              const ownerOnly = OWNER_ONLY.includes(p.key);
              const locked = disabled || isOwner || ownerOnly;
              const added = !isOwner && !preset.has(p.key) && on;
              const removed = !isOwner && preset.has(p.key) && !on;
              return (
                <li key={p.key}>
                  <label className={cn('flex items-center gap-4 px-4 py-3 transition', locked ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2/50', removed && 'bg-danger/[0.03]', added && 'bg-success/[0.04]')}>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                        {p.label}
                        {p.money && <Banknote className="size-3.5 text-warning" aria-label="Touches money" />}
                        {ownerOnly && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-subtle"><Lock className="size-3" /> owners only</span>}
                        {added && <span className="rounded-full bg-success/15 px-2 text-[11px] font-semibold text-success">added</span>}
                        {removed && <span className="rounded-full bg-danger/10 px-2 text-[11px] font-semibold text-danger">removed</span>}
                      </span>
                      <span className="block text-[12.5px] text-fg-muted">{p.description}</span>
                    </span>
                    <input type="checkbox" role="switch" className="peer sr-only" checked={on} disabled={locked} onChange={() => toggle(p.key)} />
                    <span aria-hidden className={cn('relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-fg', on ? 'bg-success' : 'bg-line-strong', locked && 'opacity-50')}>
                      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
