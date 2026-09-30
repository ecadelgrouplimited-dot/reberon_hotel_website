import { prisma, en, log } from '../lib.js';

/**
 * Movement III demo: a pre-opening "drawings walk" for every room type and
 * for the hall (empty and set), built from the images already in the library.
 * Published, but invisible until the owner switches on features.toursEnabled.
 * When a real scan exists, a LIVE tour in the same slot replaces these.
 */
export async function seedTours() {
  if (await prisma.tour.count({ where: { isSeed: true } })) return log('tours', 'exists, skipped');
  const rooms = await prisma.roomType.findMany({ where: { deletedAt: null }, orderBy: { order: 'asc' } });
  let made = 0;
  for (const [i, r] of rooms.entries()) {
    const frames = [...new Set([r.heroMediaId, ...r.galleryIds].filter((x): x is string => !!x))];
    if (frames.length < 2) continue;
    const name = (r.name as { en?: string }).en ?? r.slug;
    const bed = (r.bedConfig as { en?: string }).en ?? '';
    const view = (r.view as { en?: string } | null)?.en ?? '';
    await prisma.tour.create({
      data: {
        slug: `${r.slug}-walk`,
        title: en(`Walk the ${name}`),
        summary: en('A first walk through the room. A camera walk replaces it when the room is finished.'),
        space: 'ROOM_TYPE',
        roomTypeId: r.id,
        provider: 'DRAWINGS',
        mediaIds: frames,
        stage: 'PRE_OPENING',
        status: 'PUBLISHED',
        order: i,
        isSeed: true,
        hotspots: {
          create: [
            { kind: 'BED', label: en(bed || 'The bed'), note: en('Firm mattress, heavy blankets for the mountain nights.'), frame: 0, x: 0.46, y: 0.64, order: 0 },
            { kind: 'CAPACITY', label: en(`Sleeps ${r.sleepsAdults} adult${r.sleepsAdults > 1 ? 's' : ''}${r.sleepsChildren ? ` and ${r.sleepsChildren} child${r.sleepsChildren > 1 ? 'ren' : ''}` : ''}`), note: en(r.sizeSqm ? `About ${r.sizeSqm} m².` : ''), frame: 0, x: 0.2, y: 0.3, order: 1 },
            { kind: 'BATH', label: en('Bathroom'), note: en('Hot shower on solar with a backup heater.'), frame: Math.min(1, frames.length - 1), x: 0.62, y: 0.55, order: 2 },
            ...(view ? [{ kind: 'VIEW' as const, label: en(view), note: en('Best in the first hour of light.'), frame: frames.length - 1, x: 0.5, y: 0.35, order: 3 }] : []),
          ],
        },
      },
    });
    made++;
  }

  const hall = await prisma.facility.findFirst({ where: { slug: 'hall' } });
  if (hall && hall.mediaIds.length >= 1) {
    const all = [...hall.mediaIds];
    for (const [variant, label, note] of [
      ['EMPTY', 'The hall, cleared', 'Timber floor, windows on two sides, room for a dance.'],
      ['SET', 'The hall, set for forty', 'Forty chairs in rows, a table at the front, the screen lowered.'],
    ] as const) {
      const frames = variant === 'EMPTY' ? all : [...all].reverse();
      if (frames.length < 2) frames.push(...frames);
      await prisma.tour.create({
        data: {
          slug: `hall-${variant.toLowerCase()}`,
          title: en(label),
          summary: en(note),
          space: 'HALL',
          variant,
          provider: 'DRAWINGS',
          mediaIds: frames,
          stage: 'PRE_OPENING',
          status: 'PUBLISHED',
          order: variant === 'EMPTY' ? 0 : 1,
          isSeed: true,
          hotspots: { create: [{ kind: 'CAPACITY', label: en(variant === 'SET' ? '40 seated in rows' : 'About 60 standing'), note: en('Projector, sound and generator backup.'), frame: 0, x: 0.5, y: 0.45, order: 0 }] },
        },
      });
      made++;
    }
  }
  log('tours', `${made} pre-opening walks (hidden until tours are switched on)`);
}
