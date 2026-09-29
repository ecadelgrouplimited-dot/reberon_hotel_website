import { rt } from '@reberon/contracts';
import { prisma, en, log, REFRESH } from '../lib.js';

const GROUPS: { key: string; title: string; items: [string, string][] }[] = [
  {
    key: 'before-you-drive',
    title: 'Before you drive',
    items: [
      ['How long is the drive from Kampala?', 'About six to seven hours with a lunch stop in Mbale. Leave by 6:30 to miss the Jinja road traffic. See [The road](/kapchorwa/the-road).'],
      ['Is the road paved?', 'Yes, all the way to Kapchorwa town. The last kilometre to the hotel is graded murram that any car manages slowly.'],
      ['How cold does it get?', 'Nights can fall to around 10 °C. Bring a jumper and a rain jacket in any month. The rooms have heavy blankets.'],
      ['Can you arrange a transfer?', 'Yes — from Mbale, Kampala or Entebbe. Send your dates on WhatsApp and we will reply with a price.'],
      ['Is there fuel and cash on the way?', 'Mbale is the last big town with several fuel stations and banks. Kapchorwa has fuel and ATMs, but fill up in Mbale to be safe.'],
      ['What if I arrive late?', 'The gate is staffed all night. Call from Mbale so the kitchen knows to wait for you.'],
    ],
  },
  {
    key: 'rooms-and-stay',
    title: 'Rooms and your stay',
    items: [
      ['When does the hotel open?', 'We are building now and plan to open in 2027. Claim a first stay and we will contact you when the calendar opens — before anyone else.'],
      ['Are the pictures real?', 'Not yet. Until the rooms are finished we show drawings and placeholders, and label them. Real photographs replace them as each room is completed.'],
      ['What are check-in and check-out times?', 'Check-in from 14:00, check-out by 10:30. Tell us if you need something different and we will try.'],
      ['Is breakfast included?', 'On bed-and-breakfast rates, yes. Breakfast starts at 6:30 for early walkers.'],
      ['Do you have Wi-Fi and power?', 'Yes. Grid power with solar and battery backup, so lights, sockets, Wi-Fi and hot water keep going in an outage.'],
      ['Can I pay by mobile money?', 'Yes — MTN MoMo, Airtel Money, Visa and Mastercard when bookings open.'],
    ],
  },
  {
    key: 'groups-and-hall',
    title: 'Groups and the hall',
    items: [
      ['How many people fit in the hall?', 'Forty theatre-style, twenty-four around tables, or more standing for a reception.'],
      ['Can a group hold all the rooms?', 'Yes. Ten rooms sleep up to twenty-four people. Ask for a group quote.'],
      ['Do you cater for events?', 'Yes, from tea breaks to a full dinner. Tell us the numbers and any dietary needs.'],
      ['Can you send a quote we can forward?', 'Yes — one page with dates, rooms, hall and price, easy to forward to your office.'],
      ['Is there a screen and sound?', 'A screen, a projector, and sound for speeches. Bring your own adapter if you use an unusual laptop.'],
      ['How far ahead should we book?', 'For December and the dry months, three months. Otherwise, a month is usually enough.'],
    ],
  },
];

export async function seedFaqs() {
  const ids: Record<string, string> = {};
  for (const g of GROUPS) {
    const existing = await prisma.faqGroup.findUnique({ where: { key: g.key } });
    if (existing) {
      ids[g.key] = existing.id;
      if (REFRESH && existing.isSeed) {
        await prisma.faqItem.deleteMany({ where: { groupId: existing.id, isSeed: true } });
        await prisma.faqItem.createMany({ data: g.items.map(([q, a], order) => ({ groupId: existing.id, question: en(q), answer: rt.md(a), order, isSeed: true })) });
      }
      continue;
    }
    const group = await prisma.faqGroup.create({
      data: {
        key: g.key,
        title: en(g.title),
        isSeed: true,
        items: { create: g.items.map(([q, a], order) => ({ question: en(q), answer: rt.md(a), order, isSeed: true })) },
      },
    });
    ids[g.key] = group.id;
  }
  log('faqs', `${GROUPS.length} groups, ${GROUPS.reduce((n, g) => n + g.items.length, 0)} items`);
  return ids;
}
