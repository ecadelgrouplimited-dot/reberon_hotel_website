import { effectivePermissions, type Permission, type Role } from '@reberon/contracts';

type Who = { role: Role; grants: string[]; revokes: string[]; canSignIn: boolean; signInFrom: string | null; signInUntil: string | null; accessExpiresAt: Date | null; status: string; deletedAt: Date | null };

const kampalaHHMM = (d = new Date()) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Kampala' }).format(d);

/** Why this person may not be in the House right now, or null. Owners are never shut out by hours. */
export function accessProblem(u: Who, now = new Date()): string | null {
  if (u.deletedAt || u.status !== 'ACTIVE') return 'Your account is not active. Ask the owner.';
  if (!u.canSignIn) return 'Your staff record does not include signing in. Ask the owner.';
  if (u.accessExpiresAt && u.accessExpiresAt <= now) return 'Your access has ended. Ask the owner.';
  if (u.role !== 'OWNER' && u.signInFrom && u.signInUntil) {
    const t = kampalaHHMM(now);
    const inside = u.signInFrom <= u.signInUntil ? t >= u.signInFrom && t < u.signInUntil : t >= u.signInFrom || t < u.signInUntil;
    if (!inside) return `You can use the House between ${u.signInFrom} and ${u.signInUntil}.`;
  }
  return null;
}

export const permissionsOf = (u: Pick<Who, 'role' | 'grants' | 'revokes'>): Permission[] => effectivePermissions(u.role, u.grants, u.revokes);

export const ACCESS_SELECT = { id: true, email: true, name: true, role: true, status: true, deletedAt: true, grants: true, revokes: true, canSignIn: true, signInFrom: true, signInUntil: true, accessExpiresAt: true } as const;
