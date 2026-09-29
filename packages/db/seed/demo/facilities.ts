import { rt } from '@reberon/contracts';
import type { FacilityStatus } from '../../src/index.js';
import { prisma, en, log, seedImage } from '../lib.js';
import type { Scene } from '../media/art.js';

const FACILITIES: { slug: string; name: string; summary: string; body: string; icon: string; status: FacilityStatus; scene: Scene }[] = [
  {
    slug: 'restaurant',
    name: 'Restaurant',
    summary: 'Breakfast from 6:30 for early walkers. Dinner until 21:30. Food from the district where we can.',
    body: 'A dining room for forty with a kitchen that opens early, because the best light on Sipi is before nine. Breakfast is included on bed-and-breakfast rates. Packed lunches can be ordered the night before.\n\nThe menu follows what is good on the slope that week: matooke, beans, greens, trout when it comes up from the river, and coffee that did not travel far.',
    icon: 'utensils',
    status: 'AVAILABLE',
    scene: 'table',
  },
  {
    slug: 'hall',
    name: 'The hall',
    summary: 'A room for forty: workshops, meetings, a small wedding. Set as you need it.',
    body: 'Forty chairs theatre-style, twenty-four around tables, or cleared for a reception. There is a screen, sound for speeches, and windows on the ridge that most presenters regret facing away from.\n\nGroups can hold rooms in the house with the hall. Ask for a quote; one page, easy to forward.',
    icon: 'presentation',
    status: 'COMING_SOON',
    scene: 'hall',
  },
  {
    slug: 'parking',
    name: 'Parking',
    summary: 'Inside the compound, lit at night, watched by the gate.',
    body: 'Space for about fifteen cars and a minibus inside the gate. The last kilometre from the main road is murram; any saloon car manages it in the dry season, take it slowly in the rains.',
    icon: 'car',
    status: 'AVAILABLE',
    scene: 'road',
  },
  {
    slug: 'power',
    name: 'Power',
    summary: 'Grid power with a solar and battery backup, so the lights and the showers stay on.',
    body: 'Kapchorwa is on the national grid, and like everywhere the grid sometimes rests. The house has solar panels and batteries that carry the lights, sockets, Wi-Fi and water heating through an outage. The generator is for the long ones.',
    icon: 'zap',
    status: 'AVAILABLE',
    scene: 'construction',
  },
  {
    slug: 'water',
    name: 'Water',
    summary: 'Our own borehole and treatment. Hot water in every room, all day.',
    body: 'Water comes from a borehole on the compound and is filtered and treated on site. Drinking water is in every room and refilled daily — please do not buy plastic bottles on our account.',
    icon: 'droplets',
    status: 'AVAILABLE',
    scene: 'falls',
  },
  {
    slug: 'terrace',
    name: 'Garden terrace',
    summary: 'Coffee in the morning, a fire in the evening when the mountain gets cold.',
    body: 'A terrace between the restaurant and the garden, facing the ridge. Morning coffee, evening fire, and a good place to wait for the cloud to lift.',
    icon: 'flame',
    status: 'COMING_SOON',
    scene: 'garden',
  },
];

export async function seedFacilities() {
  const ids: Record<string, string> = {};
  for (const [order, f] of FACILITIES.entries()) {
    const media = [
      await seedImage({ key: `facility-${f.slug}-1`, scene: f.scene, label: f.name, alt: f.name, folder: 'Facilities' }),
      await seedImage({ key: `facility-${f.slug}-2`, scene: f.scene, mood: 'mist', label: `${f.name} — detail`, alt: `${f.name}, detail`, folder: 'Facilities' }),
    ];
    const rec = await prisma.facility.upsert({
      where: { slug: f.slug },
      create: { slug: f.slug, name: en(f.name), summary: en(f.summary), body: rt.md(f.body), icon: f.icon, status: f.status, mediaIds: media, order, isSeed: true },
      update: {},
    });
    ids[f.slug] = rec.id;
  }
  log('facilities', `${FACILITIES.length}`);
  return ids;
}
