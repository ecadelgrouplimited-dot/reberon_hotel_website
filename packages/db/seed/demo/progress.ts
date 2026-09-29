import { rt } from '@reberon/contracts';
import { slugify } from '@reberon/utils';
import type { Milestone } from '../../src/index.js';
import { prisma, en, log, seedImage } from '../lib.js';

const UPDATES: { date: string; title: string; body: string; milestone?: Milestone; percent: number; photos: number }[] = [
  { date: '2025-11-14', title: 'Ground broken', milestone: 'GROUNDBREAKING', percent: 2, photos: 3, body: 'A short prayer, a long lunch, and the first spade in red Kapchorwa soil. The surveyors have marked where ten rooms and a hall will stand.' },
  { date: '2025-12-05', title: 'Clearing and setting out', percent: 5, photos: 2, body: 'The site is cleared and levelled. We kept the two old Nandi flame trees at the gate; the building moved two metres to let them stay.' },
  { date: '2026-01-16', title: 'Foundations poured', milestone: 'FOUNDATION', percent: 12, photos: 3, body: 'Foundations are in. The dry season helped: three weeks without rain and the concrete cured slowly and well.' },
  { date: '2026-02-20', title: 'Ground-floor columns', milestone: 'STRUCTURE', percent: 20, photos: 2, body: 'Columns for the ground floor are up. You can now stand where the restaurant will be and see which way breakfast will face.' },
  { date: '2026-03-18', title: 'First slab, first rain', percent: 27, photos: 2, body: 'The first-floor slab was poured the day before the long rains began. The crew worked late; nobody complained about the timing afterwards.' },
  { date: '2026-04-22', title: 'Working through the long rains', percent: 33, photos: 3, body: 'April is the wettest month on the mountain. Work slowed but did not stop — blockwork under tarpaulins, and a lot of tea.' },
  { date: '2026-05-27', title: 'Upper floor rising', percent: 41, photos: 2, body: 'Columns for the upper floor. From the top of the scaffolding, the Summit Suite window already frames the ridge the way the drawings promised.' },
  { date: '2026-06-24', title: 'Roof structure', milestone: 'ROOF', percent: 50, photos: 3, body: 'Halfway. The roof trusses are on, and the building finally looks like a house rather than a frame.' },
  { date: '2026-07-15', title: 'Under cover', percent: 57, photos: 2, body: 'Roof sheets are on. Rain now falls on a roof, not on the work — the most important milestone nobody photographs.' },
  { date: '2026-08-05', title: 'Walls, windows, wiring', percent: 64, photos: 3, body: 'Window frames are in on the mountain side. Electricians are running cables for the sockets that will sit by every bed.' },
  { date: '2026-08-26', title: 'Solar and water', percent: 70, photos: 2, body: 'The borehole is tested and the solar panels are on the south roof. Hot water, all day, is now a plan with pipes.' },
  { date: '2026-09-09', title: 'Plaster and screed', milestone: 'FINISHES', percent: 76, photos: 3, body: 'Walls are plastered and floors screeded. The rooms have their final shapes; you can tell which one will be the quiet one.' },
  { date: '2026-09-23', title: 'The first room, nearly', percent: 80, photos: 3, body: 'Room 201 is our sample room: tiles, paint, a window seat. We will photograph it properly when the furniture arrives, and it will replace the drawings on this site.' },
];

export async function seedProgress() {
  let n = 0;
  for (const u of UPDATES) {
    const slug = slugify(u.title);
    if (await prisma.progressUpdate.findUnique({ where: { slug } })) continue;
    const mediaIds: string[] = [];
    for (let i = 0; i < u.photos; i++) {
      mediaIds.push(
        await seedImage({
          key: `progress-${slug}-${i}`,
          scene: i === 2 ? 'ridge' : 'construction',
          progress: u.percent / 100,
          mood: (['dawn', 'mist', 'day', 'dusk'] as const)[(n + i) % 4],
          label: `Site, ${u.date}`,
          alt: `${u.title}: the site on ${u.date}`,
          folder: 'Progress',
          tags: ['progress'],
        }),
      );
    }
    await prisma.progressUpdate.create({
      data: {
        slug,
        title: en(u.title),
        body: rt.md(u.body),
        happenedOn: new Date(`${u.date}T00:00:00Z`),
        milestone: u.milestone,
        percentComplete: u.percent,
        mediaIds,
        status: 'PUBLISHED',
        isSeed: true,
      },
    });
    n++;
  }
  log('progress', `${UPDATES.length} updates`);
}
