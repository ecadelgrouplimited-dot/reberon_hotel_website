import { rt } from '@reberon/contracts';
import { prisma, en, log, seedImage } from '../lib.js';
import type { Scene } from '../media/art.js';

interface RoomSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  sleepsAdults: number;
  sleepsChildren: number;
  bedConfig: string;
  sizeSqm: number;
  view: string;
  count: number;
  ugx: number;
  usd: number;
  amenities: string[];
  mood: 'dawn' | 'mist' | 'day' | 'dusk';
  gallery: [Scene, string][];
}

export const ROOMS: RoomSeed[] = [
  {
    slug: 'elgon-view-king',
    name: 'Elgon View King',
    tagline: 'A king bed facing the mountain. The window is the point.',
    description: `
The room is built around one window. It faces south-west, toward the upper slopes of Elgon, so the morning arrives on the ridge before it reaches the town.

## What you will find
- A king bed with heavy blankets. At 1,900 metres the nights are cold, and we would rather you were warm.
- A writing desk by the window and sockets by the bed.
- A shower that runs hot all day, not only when the sun has been out.
- A kettle and a bag of coffee grown within twenty kilometres of the room.

## What to know
Four rooms of this type sit on the upper floor. They are the quietest in the house. If the cloud is down you will see the cloud — that is the weather here, and some guests come for it.`,
    sleepsAdults: 2,
    sleepsChildren: 1,
    bedConfig: 'One king bed',
    sizeSqm: 24,
    view: 'Mount Elgon',
    count: 4,
    ugx: 250_000,
    usd: 70,
    amenities: ['mountain-view', 'hot-shower', 'warm-bedding', 'kettle-coffee', 'desk', 'wifi', 'backup-power', 'usb-sockets', 'wardrobe', 'towels', 'toiletries', 'safe'],
    mood: 'dawn',
    gallery: [['room', 'The bed and the window'], ['ridge', 'The view south-west'], ['bath', 'The bathroom'], ['table', 'Coffee by the window'], ['night', 'The ridge after dark'], ['garden', 'The garden below']],
  },
  {
    slug: 'sipi-twin',
    name: 'Sipi Twin',
    tagline: 'Two beds for two walkers. Boots by the door, maps on the desk.',
    description: `
Made for friends, colleagues and anyone who walks to Sipi in the morning and wants their own bed at night.

## What you will find
- Two generous single beds, each with its own lamp and socket.
- Hooks and a drying rail for wet jackets — the falls are loud and they are wet.
- A desk wide enough for two laptops or one large map.
- A hot shower and a kettle with local coffee.

## What to know
Three rooms of this type face the garden side of the compound. The walk to Sipi's first fall is about twenty minutes by car and a morning on foot; the desk can arrange a guide.`,
    sleepsAdults: 2,
    sleepsChildren: 0,
    bedConfig: 'Two single beds',
    sizeSqm: 22,
    view: 'Garden and escarpment',
    count: 3,
    ugx: 230_000,
    usd: 65,
    amenities: ['garden-view', 'escarpment-view', 'hot-shower', 'warm-bedding', 'kettle-coffee', 'desk', 'wifi', 'backup-power', 'usb-sockets', 'wardrobe', 'towels', 'mosquito-net'],
    mood: 'mist',
    gallery: [['room', 'Two beds, one window'], ['falls', 'Sipi, twenty minutes away'], ['bath', 'The bathroom'], ['garden', 'The garden side'], ['road', 'The road to the falls']],
  },
  {
    slug: 'coffee-terrace-family',
    name: 'Coffee Terrace Family',
    tagline: 'Room for a family, on the ground, with a door to the terrace.',
    description: `
A larger room on the ground floor, step-free from the car to the bed, with a door onto the terrace where the coffee is served in the morning.

## What you will find
- A queen bed and two singles, or a queen and one single with a cot on request.
- A sitting corner for the evening when the children are asleep and the adults are not.
- A bathtub as well as a shower.
- A kettle, Kapchorwa coffee and something for the children that is not coffee.

## What to know
Two rooms of this type. They are closest to the restaurant and the car park, which makes arriving late with sleeping children easier.`,
    sleepsAdults: 3,
    sleepsChildren: 2,
    bedConfig: 'One queen bed and two singles',
    sizeSqm: 32,
    view: 'Terrace and garden',
    count: 2,
    ugx: 380_000,
    usd: 105,
    amenities: ['garden-view', 'ground-floor', 'hot-shower', 'bathtub', 'warm-bedding', 'kettle-coffee', 'sofa', 'extra-bed', 'wifi', 'backup-power', 'tv', 'parking', 'towels', 'mosquito-net'],
    mood: 'day',
    gallery: [['room', 'The family room'], ['garden', 'The terrace door'], ['coffee', 'Coffee grows around the compound'], ['bath', 'Bath and shower'], ['table', 'Breakfast on the terrace']],
  },
  {
    slug: 'summit-suite',
    name: 'Summit Suite',
    tagline: 'The corner of the top floor. Two windows, one balcony, the whole ridge.',
    description: `
The one room we would keep for ourselves. A corner of the top floor, with windows on two sides and a balcony that faces the ridge and the town.

## What you will find
- A king bed, a sitting room with a sofa, and a balcony with two chairs.
- A bathtub under the second window.
- Robes, heavy blankets, and a coffee set with beans from a named farm.

## What to know
There is one Summit Suite. It is the first room people ask about, so if you have dates in mind, tell us early.`,
    sleepsAdults: 2,
    sleepsChildren: 1,
    bedConfig: 'One king bed, sofa in the sitting room',
    sizeSqm: 40,
    view: 'Mount Elgon and the town',
    count: 1,
    ugx: 520_000,
    usd: 145,
    amenities: ['mountain-view', 'escarpment-view', 'balcony', 'hot-shower', 'bathtub', 'warm-bedding', 'kettle-coffee', 'sofa', 'desk', 'wifi', 'backup-power', 'tv', 'safe', 'towels', 'toiletries'],
    mood: 'dusk',
    gallery: [['room', 'The suite at dusk'], ['ridge', 'From the balcony'], ['bath', 'The bath under the window'], ['night', 'Night on Elgon'], ['table', 'Coffee on the balcony'], ['ridge', 'Cloud on the escarpment']],
  },
];

export async function seedRooms() {
  const amenities = await prisma.amenity.findMany();
  const amenityId = new Map(amenities.map((a) => [a.key, a.id]));
  const ids: Record<string, string> = {};
  let roomNumber = { 1: 101, 2: 201 } as Record<number, number>;

  for (const [order, r] of ROOMS.entries()) {
    const hero = await seedImage({ key: `room-${r.slug}-hero`, scene: 'room', mood: r.mood, label: `${r.name} — render`, alt: `${r.name}: the bed facing the window`, folder: 'Rooms', tags: [r.slug] });
    const gallery: string[] = [hero];
    for (const [i, [scene, alt]] of r.gallery.entries()) {
      gallery.push(await seedImage({ key: `room-${r.slug}-${i}`, scene, mood: r.mood, label: alt, alt: `${r.name}: ${alt.toLowerCase()}`, folder: 'Rooms', tags: [r.slug] }));
    }
    const data = {
      name: en(r.name),
      tagline: en(r.tagline),
      description: rt.md(r.description),
      sleepsAdults: r.sleepsAdults,
      sleepsChildren: r.sleepsChildren,
      bedConfig: en(r.bedConfig),
      sizeSqm: r.sizeSqm,
      view: en(r.view),
      heroMediaId: hero,
      galleryIds: gallery,
      fromPriceUgx: BigInt(r.ugx),
      fromPriceUsd: BigInt(r.usd * 100),
      order,
      status: 'PUBLISHED' as const,
      seo: { description: en(`${r.name} at Reberon Hotel, Kapchorwa. ${r.tagline}`) },
      isSeed: true,
    };
    const rt_ = await prisma.roomType.upsert({ where: { slug: r.slug }, create: { slug: r.slug, ...data }, update: {} });
    ids[r.slug] = rt_.id;
    await prisma.roomTypeAmenity.createMany({
      data: r.amenities.map((k, i) => ({ roomTypeId: rt_.id, amenityId: amenityId.get(k)!, order: i })),
      skipDuplicates: true,
    });
    // Physical rooms: ground-floor family rooms, rest upstairs.
    const floor = r.slug === 'coffee-terrace-family' ? 1 : r.slug === 'sipi-twin' ? 1 : 2;
    for (let i = 0; i < r.count; i++) {
      const number = String(roomNumber[floor]!++);
      await prisma.room.upsert({ where: { number }, create: { number, floor, roomTypeId: rt_.id, isSeed: true }, update: {} });
    }
  }
  log('room types', `${ROOMS.length} types, ${ROOMS.reduce((n, r) => n + r.count, 0)} physical rooms`);
  return ids;
}
