import { faker } from '@faker-js/faker';
import { referenceCode } from '@reberon/utils';
import type { Channel, ConversationStatus, Intent, ContactSource, WaitlistStatus } from '../../src/index.js';
import { prisma, log } from '../lib.js';

const UG_FIRST = ['Cheptoek', 'Chelangat', 'Kiprotich', 'Chemutai', 'Kiprop', 'Nakato', 'Okello', 'Achieng', 'Mugisha', 'Namutebi', 'Ssemakula', 'Atim', 'Wanyama', 'Nabirye', 'Kato', 'Babirye', 'Opio', 'Akello', 'Tumusiime', 'Kyomuhendo'];
const UG_GIVEN = ['Grace', 'Brian', 'Esther', 'Moses', 'Ruth', 'Isaac', 'Florence', 'Samuel', 'Joan', 'Patrick', 'Sarah', 'Emmanuel', 'Agnes', 'Denis', 'Harriet', 'Ronald', 'Winnie', 'Ivan', 'Stella', 'Joseph'];
const INTL = ['Anna Lindqvist', 'Tom Becker', 'Claire Dubois', 'James Whitfield', 'Priya Nair', 'Lukas Meier', 'Hannah Okafor', 'Marta Rossi', 'Daniel Kim', 'Sophie Laurent', 'Ben Carter', 'Aisha Mwangi'];

const ENQUIRIES: [Intent, string][] = [
  ['STAY', 'Hello, we are a couple planning to come for three nights around Christmas. Is the Summit Suite available and what would it cost?'],
  ['STAY', 'When exactly do you open? We want to bring our parents to see Sipi in February.'],
  ['EVENT', 'Our district office is planning a two-day workshop for 30 people in March. Do you have a hall and can you cater lunch?'],
  ['GROUP', 'We are a hiking group of 12 doing the Sasa trail. Can we stay two nights before and one after, and leave luggage with you?'],
  ['GENERAL', 'Do you arrange transfers from Entebbe? We land at 22:00.'],
  ['STAY', 'Is the family room step-free? My mother uses a walking frame.'],
  ['EVENT', 'Small wedding, about 40 guests, April 2027. Can we see the hall on a video call?'],
  ['GENERAL', 'Can you recommend a coffee farm visit for a morning? We are interested in buying beans.'],
  ['STAY', 'Two twin rooms for a week in July for a research team. Is the Wi-Fi good enough for video calls?'],
  ['GROUP', 'School trip — 20 students and 3 teachers. Do you do group rates?'],
  ['STAY', 'Do you accept MTN mobile money for the deposit?'],
  ['GENERAL', 'Is the road passable in April with a saloon car?'],
];
const REPLIES = [
  'Thank you for writing. We open in 2027 — may I add you to the first-stay list with those dates?',
  'Yes, we can. I have noted the numbers; a one-page quote will follow on WhatsApp this week.',
  'The family rooms are on the ground floor and step-free from the car park to the bed.',
  'We arrange transfers from Entebbe with a driver who knows the night road. I will send a price.',
  'Good question — the road is tarmac to Kapchorwa. Take the last kilometre slowly after rain.',
];
const NOTES = ['Called back, no answer. Try again tomorrow morning.', 'Potential group booking — flag for Denis.', 'Sent quote draft to manager for review.', 'Prefers WhatsApp over email.'];

function ugPhone() {
  return `+2567${faker.helpers.arrayElement(['0', '1', '4', '5', '7', '8'])}${faker.string.numeric(7)}`;
}

export async function seedInboxAndWaitlist(userIds: string[], roomTypeIds: string[]) {
  if (await prisma.conversation.count({ where: { isSeed: true } })) return log('inbox', 'exists, skipped');
  faker.seed(1900);
  const now = Date.now();
  const day = 86_400_000;

  const contacts = [];
  for (let i = 0; i < 64; i++) {
    const intl = i % 5 === 0;
    const name = intl ? faker.helpers.arrayElement(INTL) : `${faker.helpers.arrayElement(UG_GIVEN)} ${faker.helpers.arrayElement(UG_FIRST)}`;
    const hasEmail = intl || faker.datatype.boolean(0.4);
    const source: ContactSource = faker.helpers.weightedArrayElement([{ value: 'WEB', weight: 5 }, { value: 'WHATSAPP', weight: 4 }, { value: 'PHONE', weight: 1 }, { value: 'EMAIL', weight: 1 }]);
    contacts.push(
      await prisma.contact.create({
        data: {
          name,
          phone: intl && faker.datatype.boolean(0.4) ? null : intl ? `+44 7700 900${faker.string.numeric(3)}` : ugPhone(),
          email: hasEmail ? faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase() : null,
          country: intl ? faker.helpers.arrayElement(['SE', 'DE', 'FR', 'GB', 'IN', 'CH', 'NG', 'IT', 'KR', 'KE']) : 'UG',
          whatsappOptIn: source === 'WHATSAPP' || faker.datatype.boolean(0.5),
          source,
          isSeed: true,
          createdAt: new Date(now - faker.number.int({ min: 1, max: 95 }) * day),
        },
      }),
    );
  }

  // Conversations
  for (let i = 0; i < 46; i++) {
    const contact = contacts[i]!;
    const [intent, text] = faker.helpers.arrayElement(ENQUIRIES);
    const channel: Channel = contact.source === 'WHATSAPP' ? 'WHATSAPP' : contact.source === 'EMAIL' ? 'EMAIL' : contact.source === 'PHONE' ? 'PHONE' : 'WEB_FORM';
    const ageDays = i < 6 ? faker.number.float({ min: 0.05, max: 1 }) : faker.number.float({ min: 1, max: 90 });
    const createdAt = new Date(now - ageDays * day);
    const status: ConversationStatus = i < 6 ? 'NEW' : faker.helpers.weightedArrayElement([
      { value: 'OPEN', weight: 3 }, { value: 'WAITING_GUEST', weight: 2 }, { value: 'DONE', weight: 6 }, { value: 'SPAM', weight: 0.4 },
    ]);
    const arrival = faker.date.between({ from: '2027-01-10', to: '2027-06-30' });
    const nights = faker.number.int({ min: 1, max: 5 });
    const context = intent === 'STAY' || intent === 'GROUP'
      ? { arrival: arrival.toISOString().slice(0, 10), departure: new Date(arrival.getTime() + nights * day).toISOString().slice(0, 10), adults: faker.number.int({ min: 1, max: intent === 'GROUP' ? 20 : 4 }), pagePath: faker.helpers.arrayElement(['/', '/rooms', '/rooms/summit-suite', '/contact', '/kapchorwa/sipi-falls']) }
      : { pagePath: faker.helpers.arrayElement(['/facilities', '/contact', '/kapchorwa/the-road']) };

    const messages: { direction: 'INBOUND' | 'OUTBOUND' | 'NOTE'; body: string; authorId?: string; createdAt: Date }[] = [{ direction: 'INBOUND', body: text, createdAt }];
    let t = createdAt.getTime();
    if (status !== 'NEW' && status !== 'SPAM') {
      const turns = faker.number.int({ min: 1, max: 4 });
      for (let k = 0; k < turns; k++) {
        t += faker.number.int({ min: 20, max: 300 }) * 60_000;
        if (t > now) break;
        const kind = k === 0 ? 'OUTBOUND' : faker.helpers.arrayElement(['INBOUND', 'OUTBOUND', 'NOTE'] as const);
        messages.push({
          direction: kind,
          body: kind === 'OUTBOUND' ? faker.helpers.arrayElement(REPLIES) : kind === 'NOTE' ? faker.helpers.arrayElement(NOTES) : faker.helpers.arrayElement(['Thank you! Yes please.', 'That works for us.', 'Could you also send the price in USD?', 'Great, we will confirm dates next week.']),
          authorId: kind === 'INBOUND' ? undefined : faker.helpers.arrayElement(userIds),
          createdAt: new Date(t),
        });
      }
    }
    await prisma.conversation.create({
      data: {
        reference: referenceCode('EQ'),
        contactId: contact.id,
        channel,
        intent,
        status,
        subject: text.split(/[.?!]/)[0]!.slice(0, 80),
        assigneeId: status === 'NEW' ? null : faker.helpers.arrayElement(userIds),
        context,
        lastMessageAt: messages.at(-1)!.createdAt,
        createdAt,
        isSeed: true,
        messages: { create: messages },
      },
    });
  }
  log('inbox', '46 conversations');

  // Waitlist
  const WL_NOTES = [null, null, 'Celebrating our anniversary.', 'Would love the Summit Suite if possible.', 'Travelling with a baby.', 'Coming for the coffee harvest.', 'Group of friends from Kampala.', 'Vegetarian breakfast please.'];
  for (let i = 0; i < 38; i++) {
    const contact = contacts[(i + 20) % contacts.length]!;
    const from = faker.date.between({ from: '2027-01-05', to: '2027-05-30' });
    const holiday = faker.datatype.boolean(0.3);
    const start = holiday ? new Date(`2027-${faker.helpers.arrayElement(['04-01', '04-15', '06-01', '08-10'])}T00:00:00Z`) : from;
    const nights = faker.number.int({ min: 1, max: 6 });
    const status: WaitlistStatus = i < 10 ? 'NEW' : faker.helpers.weightedArrayElement([{ value: 'NEW', weight: 5 }, { value: 'CONTACTED', weight: 3 }, { value: 'DECLINED', weight: 0.5 }]);
    await prisma.waitlistEntry.create({
      data: {
        reference: referenceCode('WL'),
        contactId: contact.id,
        roomTypeId: faker.datatype.boolean(0.85) ? faker.helpers.arrayElement(roomTypeIds) : null,
        preferredFrom: start,
        preferredTo: new Date(start.getTime() + nights * day),
        flexibleDates: faker.datatype.boolean(0.4),
        adults: faker.number.int({ min: 1, max: 4 }),
        children: faker.datatype.boolean(0.25) ? faker.number.int({ min: 1, max: 2 }) : 0,
        note: faker.helpers.arrayElement(WL_NOTES),
        status,
        priority: faker.datatype.boolean(0.1) ? faker.number.int({ min: 1, max: 5 }) : 0,
        createdAt: new Date(now - faker.number.float({ min: 0.1, max: 80 }) * day),
        isSeed: true,
      },
    });
  }
  log('waitlist', '38 entries');
}
