import type { Role } from './enums.js';

export const PERMISSIONS = [
  'dashboard:view',
  'content:read',
  'content:write',
  'content:publish',
  'media:read',
  'media:upload',
  'media:manage',
  'inbox:read',
  'inbox:write',
  'waitlist:read',
  'waitlist:write',
  'waitlist:export',
  'settings:read',
  'settings:write',
  'settings:features',
  'users:manage',
  'audit:read',
  'vault:manage',
  'rooms:status',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

/** "Who may touch what" from the spec, made enforceable. The API is the wall. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  MANAGER: ALL.filter((p) => !['settings:features', 'users:manage', 'vault:manage'].includes(p)),
  DESK: ['dashboard:view', 'media:read', 'media:upload', 'inbox:read', 'inbox:write', 'waitlist:read', 'waitlist:write', 'rooms:status'],
  HOUSEKEEPING: ['rooms:status'],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: 'Brief, money, rates, users. Everything — without needing to run the morning desk.',
  MANAGER: 'Bookings, rates, inbox, rooms and the website. Not bank keys, not users.',
  DESK: 'Arrivals, walk-ins, folio, notes, inbox. Cannot rewrite a rate plan.',
  HOUSEKEEPING: 'Dirty and clean. Cannot see payments.',
};
