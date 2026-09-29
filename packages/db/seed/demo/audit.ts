import { faker } from '@faker-js/faker';
import { prisma, log } from '../lib.js';

export async function seedAudit(userIds: string[]) {
  if (await prisma.auditLog.count({ where: { isSeed: true } })) return;
  faker.seed(4321);
  const [pages, rooms, progress, convs] = await Promise.all([
    prisma.page.findMany({ select: { id: true, slug: true } }),
    prisma.roomType.findMany({ select: { id: true, slug: true } }),
    prisma.progressUpdate.findMany({ select: { id: true, slug: true } }),
    prisma.conversation.findMany({ select: { id: true, reference: true }, take: 30 }),
  ]);
  const actions: (() => { action: string; entityType: string; entityId: string; summary: string })[] = [
    () => { const p = faker.helpers.arrayElement(pages); return { action: 'page.publish', entityType: 'Page', entityId: p.id, summary: `Published /${p.slug}` }; },
    () => { const p = faker.helpers.arrayElement(pages); return { action: 'page.update', entityType: 'Page', entityId: p.id, summary: `Edited draft of /${p.slug}` }; },
    () => { const r = faker.helpers.arrayElement(rooms); return { action: 'room_type.update', entityType: 'RoomType', entityId: r.id, summary: `Updated ${r.slug}` }; },
    () => { const p = faker.helpers.arrayElement(progress); return { action: 'progress.create', entityType: 'ProgressUpdate', entityId: p.id, summary: `Posted "${p.slug}"` }; },
    () => { const c = faker.helpers.arrayElement(convs); return { action: 'conversation.update', entityType: 'Conversation', entityId: c.id, summary: `Changed status of ${c.reference}` }; },
    () => { const c = faker.helpers.arrayElement(convs); return { action: 'message.create', entityType: 'Conversation', entityId: c.id, summary: `Replied on ${c.reference}` }; },
  ];
  const now = Date.now();
  await prisma.auditLog.createMany({
    data: Array.from({ length: 180 }, () => ({
      ...faker.helpers.arrayElement(actions)(),
      actorId: faker.helpers.arrayElement(userIds),
      actorType: 'USER' as const,
      ip: faker.internet.ipv4(),
      userAgent: 'Seed',
      isSeed: true,
      createdAt: new Date(now - faker.number.float({ min: 0.01, max: 60 }) * 86_400_000),
    })),
  });
  log('audit', '180 entries');
}
