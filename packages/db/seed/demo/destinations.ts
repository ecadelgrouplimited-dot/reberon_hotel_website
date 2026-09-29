import { rt } from '@reberon/contracts';
import type { DestinationKind } from '../../src/index.js';
import { prisma, en, log, seedImage, bid } from '../lib.js';
import type { Scene } from '../media/art.js';

interface Stop { name: string; minutes: number | null; altitude: number; note: string; lat: number; lng: number }

interface DestSeed {
  slug: string;
  kind: DestinationKind;
  name: string;
  tagline: string;
  body: string;
  scene: Scene;
  gallery: Scene[];
  lat?: number;
  lng?: number;
  distanceKm?: number;
  driveMinutes?: number;
  stops?: Stop[];
  blocks?: (media: string[]) => object[];
}

const MONTHS: [string, 'dry' | 'short-rains' | 'long-rains', number, string][] = [
  ['Jan', 'dry', 4, 'Clear mornings, dusty roads, cold nights.'],
  ['Feb', 'dry', 5, 'The best walking month. Book early.'],
  ['Mar', 'long-rains', 11, 'Rains begin. The falls get loud.'],
  ['Apr', 'long-rains', 16, 'Wettest weeks. Afternoon storms, green everything.'],
  ['May', 'long-rains', 15, 'Heavy afternoons, bright mornings.'],
  ['Jun', 'dry', 8, 'Drying out. Cool, often misty.'],
  ['Jul', 'dry', 9, 'Cool and changeable. Good for coffee farms.'],
  ['Aug', 'short-rains', 12, 'Showers return; the harvest starts to flower.'],
  ['Sep', 'short-rains', 11, 'Mist in the mornings, clear evenings.'],
  ['Oct', 'short-rains', 12, 'Coffee harvest begins. Muddy lanes.'],
  ['Nov', 'short-rains', 9, 'Harvest season. The slopes smell of cherry.'],
  ['Dec', 'dry', 5, 'Dry, bright and busy with families home for Christmas.'],
];

const DESTINATIONS: DestSeed[] = [
  {
    slug: 'sipi-falls',
    kind: 'PLACE',
    name: 'Sipi Falls',
    tagline: 'Three falls down one escarpment, twenty minutes from the house.',
    scene: 'falls',
    gallery: ['falls', 'ridge', 'road', 'coffee'],
    lat: 1.3339,
    lng: 34.3796,
    distanceKm: 14,
    driveMinutes: 25,
    body: `
Sipi is three waterfalls, one above the other, where the Sipi river drops off the edge of Mount Elgon. The largest falls about ninety-nine metres. You can see it from the road; you should walk to it.

## The walk
A guided walk to all three falls takes most of a morning — about four hours at an easy pace, longer if you stop to be soaked at the bottom of the main fall. Paths are steep in places and slippery after rain. Good shoes matter more than fitness.

## What we arrange
- A local guide from Sipi, paid fairly, booked the night before.
- A driver there and back if you would rather not park on the verge.
- A packed lunch from the kitchen.

> Go early. The light is best before nine and the paths are quiet.

## What we do not pretend
In the long rains the falls are magnificent and the paths are mud. In the dry season the paths are easy and the falls are thinner. Both are worth it.`,
  },
  {
    slug: 'mount-elgon',
    kind: 'PLACE',
    name: 'Mount Elgon',
    tagline: 'An old volcano with one of the widest calderas on earth. Kapchorwa sits on its northern shoulder.',
    scene: 'ridge',
    gallery: ['ridge', 'night', 'road', 'garden'],
    lat: 1.1333,

    lng: 34.55,
    distanceKm: 30,
    driveMinutes: 60,
    body: `
Mount Elgon is an extinct shield volcano on the border of Uganda and Kenya. Its summit, Wagagai, stands at 4,321 metres. It is wide rather than steep, and much of it is protected as Mount Elgon National Park.

## Ways to see it
- **A day on the lower slopes**, with a ranger, through bamboo and montane forest.
- **The Sasa or Sipi trails** to the caldera, three to five days with porters, arranged through the Uganda Wildlife Authority.
- **From your window.** Many guests do only this and leave content.

## Practical
Park fees are paid to UWA. We can connect you with licensed guides and porters, and hold your luggage while you are on the mountain.`,
  },
  {
    slug: 'kapchorwa-coffee',
    kind: 'THEME',
    name: 'Coffee',
    tagline: 'Arabica grown at altitude by the families who own the slopes. You will drink it at breakfast.',
    scene: 'coffee',
    gallery: ['coffee', 'table', 'garden', 'coffee'],
    distanceKm: 5,
    driveMinutes: 15,
    body: `
The slopes around Kapchorwa grow Arabica coffee between about 1,600 and 2,300 metres — high enough that the cherries ripen slowly and the cup is bright. Most of it is grown on small family farms, picked by hand and washed at community stations.

## Seed to cup
Spend a morning on a farm: pick ripe cherry (in season, roughly October to January), pulp and wash it, see it dry on raised beds, roast a pan over a fire, and drink what you made. Farmers are paid for their time, not tipped.

## Take some home
The coffee in your room and at breakfast is from farms within twenty kilometres of the house. We tell you which ones.`,
  },
  {
    slug: 'the-road',
    kind: 'ROUTE',
    name: 'The road',
    tagline: 'Kampala to Kapchorwa, honestly: about six to seven hours with a stop.',
    scene: 'road',
    gallery: ['road', 'ridge', 'road'],
    driveMinutes: 390,
    body: `
Most guests drive. The road is tarmac all the way to Kapchorwa, and the last hour climbs the escarpment with views that make people late.

## Leave early
Leave Kampala by 6:30 and you avoid the Jinja traffic and reach the house for lunch. Leave after nine and plan to arrive for dinner.

## Stops worth making
Jinja for the Nile and a coffee. Mbale for fuel, cash, and a proper lunch. Sipi viewpoint in the last half hour, if the cloud allows.`,
    stops: [
      { name: 'Kampala', minutes: null, altitude: 1190, note: 'Leave by 6:30 to beat the traffic on the Jinja road.', lat: 0.3476, lng: 32.5825 },
      { name: 'Jinja', minutes: 120, altitude: 1140, note: 'Cross the Nile. Good coffee, clean restrooms.', lat: 0.4244, lng: 33.2042 },
      { name: 'Tororo junction', minutes: 110, altitude: 1180, note: 'Keep left for Mbale.', lat: 0.6927, lng: 34.1809 },
      { name: 'Mbale', minutes: 50, altitude: 1150, note: 'Fuel, cash and lunch. Wanale rock above the town.', lat: 1.0647, lng: 34.1797 },
      { name: 'Sipi viewpoint', minutes: 60, altitude: 1780, note: 'The road climbs the escarpment. Stop if the falls are showing.', lat: 1.3339, lng: 34.3796 },
      { name: 'Kapchorwa', minutes: 30, altitude: 1900, note: 'You are here. Tea is ready.', lat: 1.396, lng: 34.45 },
    ],
    blocks: () => [],
  },
  {
    slug: 'getting-here',
    kind: 'PRACTICAL',
    name: 'Getting here',
    tagline: 'By car, by bus, or with us. The last kilometre explained.',
    scene: 'road',
    gallery: ['road', 'garden'],
    body: `
## By car
Follow the Mbale–Kapchorwa road into town. The turn for the hotel is signposted; the last kilometre is a graded murram road that any car manages slowly. Parking is inside the gate.

## By bus
Buses and shared taxis run from Kampala to Mbale through the day, and from Mbale to Kapchorwa about every hour until late afternoon. Tell us your bus and we will meet it in town.

## With us
We can arrange a transfer from Mbale, from Kampala, or from Entebbe airport, with a driver who knows the road in the rain. Ask for a price with your dates.

## Arriving late
The gate is staffed all night. Call the desk from Mbale so the kitchen knows to wait.`,
  },
  {
    slug: 'when-to-come',
    kind: 'SEASON',
    name: 'When to come',
    tagline: 'Dry months and wet months, without pretending every day is clear.',
    scene: 'ridge',
    gallery: ['ridge', 'falls', 'coffee'],
    body: `
Kapchorwa has two dry seasons and two rainy ones. It is never hot: days are warm, nights are cold, and cloud can sit on the mountain at any time of year.

Dry months are best for walking. Wet months are best for the falls, the green, and a quieter house. The coffee harvest runs roughly October to January.`,
    blocks: () => [
      {
        id: bid('season'),
        type: 'seasonStrip',
        data: {
          eyebrow: en('Month by month'),
          heading: en('A year on the mountain'),
          months: MONTHS.map(([month, season, rainyDays, note]) => ({ month, season, rainyDays, note: en(note) })),
        },
      },
    ],
  },
];

export async function seedDestinations() {
  const ids: Record<string, string> = {};
  for (const [order, d] of DESTINATIONS.entries()) {
    const hero = await seedImage({ key: `dest-${d.slug}-hero`, scene: d.scene, label: d.name, alt: d.name, folder: 'Destination', tags: [d.slug] });
    const gallery = [];
    for (const [i, scene] of d.gallery.entries()) {
      gallery.push(await seedImage({ key: `dest-${d.slug}-${i}`, scene, label: `${d.name} ${i + 1}`, alt: `${d.name}, view ${i + 1}`, folder: 'Destination', tags: [d.slug] }));
    }
    const existing = await prisma.destination.findUnique({ where: { slug: d.slug } });
    if (existing) {
      ids[d.slug] = existing.id;
      continue;
    }
    const rec = await prisma.destination.create({
      data: {
        slug: d.slug,
        kind: d.kind,
        name: en(d.name),
        tagline: en(d.tagline),
        body: rt.md(d.body),
        blocks: (d.blocks?.(gallery) ?? []) as object[],
        heroMediaId: hero,
        galleryIds: gallery,
        lat: d.lat,
        lng: d.lng,
        distanceKm: d.distanceKm,
        driveMinutes: d.driveMinutes,
        order,
        status: 'PUBLISHED',
        seo: { description: en(d.tagline) },
        isSeed: true,
        stops: d.stops
          ? {
              create: d.stops.map((s, i) => ({
                order: i,
                name: en(s.name),
                note: en(s.note),
                minutesFromPrev: s.minutes,
                altitude: s.altitude,
                lat: s.lat,
                lng: s.lng,
              })),
            }
          : undefined,
      },
    });
    ids[d.slug] = rec.id;
  }
  log('destinations', `${DESTINATIONS.length}`);
  return ids;
}

export { MONTHS };
