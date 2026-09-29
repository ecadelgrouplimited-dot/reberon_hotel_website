import argon2 from 'argon2';
import type { Role } from '../../src/index.js';
import { prisma, log } from '../lib.js';

export const SEED_USERS: { email: string; name: string; role: Role; phone?: string }[] = [
  { email: 'owner@reberonhotel.ug', name: 'Denis Mayamba', role: 'OWNER', phone: '+256700000101' },
  { email: 'wilson@ecadelgroup.com', name: 'Wilson Ecaat', role: 'OWNER', phone: '+256700000102' },
  { email: 'manager@reberonhotel.ug', name: 'Grace Chemutai', role: 'MANAGER', phone: '+256700000103' },
  { email: 'desk@reberonhotel.ug', name: 'Brian Cheptoek', role: 'DESK', phone: '+256700000104' },
  { email: 'housekeeping@reberonhotel.ug', name: 'Sarah Chelangat', role: 'HOUSEKEEPING' },
];

export async function seedUsers() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('SEED_PASSWORD must be set (12+ chars)');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
  const ids: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, passwordHash, status: 'ACTIVE', isSeed: true },
      update: {},
    });
    ids[u.email] = user.id;
  }
  log('users', `${SEED_USERS.length} (password from SEED_PASSWORD)`);
  return ids;
}
