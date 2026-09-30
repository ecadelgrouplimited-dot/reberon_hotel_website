import { faker } from '@faker-js/faker';
import { hotelToday, addDays, randomCode } from '@reberon/utils';
import { prisma, log } from '../lib.js';
import { priceFor } from './booking.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const at = (iso: string, hh: number, mm = 0) => new Date(`${iso}T${String(hh - 3).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`); // Kampala → UTC

const GOOD = [
  'Woke up above the clouds. The coffee on the terrace was the best we had in Uganda.',
  'Quiet, warm blankets, and a hot shower after the falls. Exactly what we needed.',
  'The staff arranged a guide to Sipi at short notice. We will be back with friends.',
  'Clean, calm and the breakfast was generous. The view from the upper floor is special.',
  'We came for the altitude training and left rested. Early breakfast was a great touch.',
  'Lovely stay. The room smelled of cedar and the bed was very comfortable.',
];
const OK = ['Good room, but the Wi-Fi dropped in the evening.', 'Nice people. Breakfast could start a little earlier for runners.', 'Comfortable, though the road up was rough after the rain.'];
const BAD = ['The hot water took a long time in the morning.', 'We were not told the restaurant closes at 21:00 and arrived late and hungry.'];
const FNB = [
  ['Dinner — grilled tilapia × 2', 70_000],
  ['Dinner — matooke and beef stew × 2', 56_000],
  ['Bar — local coffee × 4', 24_000],
  ['Packed lunch × 2', 50_000],
  ['Laundry', 20_000],
] as const;

/**
 * Movement IV demo: three months of past stays (with returning guests and
 * feedback), guests in the house tonight, a room left dirty by a morning
 * departure, one on maintenance, and a duplicate guest to merge.
 */
export async function seedHouse(ids: { ownerId: string; deskId: string; housekeepingId: string }) {
  if (await prisma.reservation.count({ where: { isSeed: true, status: { in: ['CHECKED_OUT', 'IN_HOUSE'] } } })) return log('house', 'exists, skipped');
  faker.seed(1904);
  const today = hotelToday();
  const plan = await prisma.ratePlan.findFirst({ where: { code: 'BB' } });
  const policy = await prisma.cancellationPolicy.findFirst({ where: { isDefault: true } });
  if (!plan || !policy) return log('house', 'no BB plan yet, skipped');
  const rooms = await prisma.room.findMany({ where: { isActive: true }, include: { roomType: true }, orderBy: { number: 'asc' } });
  const capacity = new Map<string, number>();
  for (const r of rooms) capacity.set(r.roomTypeId, (capacity.get(r.roomTypeId) ?? 0) + 1);
  const contacts = await prisma.contact.findMany({ where: { isSeed: true, mergedIntoId: null }, orderBy: { createdAt: 'asc' }, take: 40 });
  const busy = new Map<string, Set<string>>(rooms.map((r) => [r.id, new Set()]));

  const free = (roomId: string, nights: string[]) => nights.every((d) => !busy.get(roomId)!.has(d));
  const nightsOf = (a: string, n: number) => Array.from({ length: n }, (_, k) => addDays(a, k));

  /** Inventory nights from today onwards must have space; past nights are recorded as sold. */
  async function takeInventory(roomTypeId: string, nights: string[]) {
    await prisma.inventoryDay.createMany({ data: nights.map((d) => ({ roomTypeId, date: day(d), totalRooms: capacity.get(roomTypeId) ?? 0 })), skipDuplicates: true });
    const future = nights.filter((d) => d >= today);
    if (future.length) {
      const rows = await prisma.inventoryDay.findMany({ where: { roomTypeId, date: { in: future.map(day) } } });
      if (rows.some((r) => r.totalRooms - r.soldRooms - r.heldRooms - r.blockedRooms < 1)) return false;
    }
    await prisma.inventoryDay.updateMany({ where: { roomTypeId, date: { in: nights.map(day) } }, data: { soldRooms: { increment: 1 } } });
    return true;
  }

  async function stay(o: {
    contactId: string;
    room: (typeof rooms)[number];
    arrival: string;
    nights: number;
    status: 'CHECKED_OUT' | 'IN_HOUSE';
    source: 'DIRECT' | 'WHATSAPP' | 'PHONE' | 'WALK_IN';
    checkoutAt?: Date;
    paidAll?: boolean;
    fnb?: number;
    feedback?: { score: 'GOOD' | 'OK' | 'BAD'; comment: string | null; allowPublic: boolean; handled: boolean } | null;
  }) {
    const nights = nightsOf(o.arrival, o.nights);
    const departure = addDays(o.arrival, o.nights);
    if (!free(o.room.id, nights)) return null;
    if (!(await takeInventory(o.room.roomTypeId, nights))) return null;
    for (const d of nights) busy.get(o.room.id)!.add(d);
    const base = Number(o.room.roomType.fromPriceUgx ?? 250_000n);
    const nightly = nights.map((d) => ({ date: d, amountMinor: BigInt(priceFor(base, d, 'UGX')) }));
    const extras = faker.helpers.arrayElements(FNB, o.fnb ?? 0).map(([description, amount], k) => ({ description, amount: BigInt(amount), date: nights[Math.min(k, nights.length - 1)]! }));
    const total = nightly.reduce((a, n) => a + n.amountMinor, 0n) + extras.reduce((a, e) => a + e.amount, 0n);
    const deposit = ((total * 30n) / 100n + 999n) / 1000n * 1000n;
    const paid = o.paidAll === false ? deposit : total;
    const created = at(addDays(o.arrival, -faker.number.int({ min: 1, max: 30 })), faker.number.int({ min: 8, max: 20 }));
    const checkedIn = at(o.arrival, faker.number.int({ min: 13, max: 19 }), faker.number.int({ min: 0, max: 59 }));
    const checkedOut = o.status === 'CHECKED_OUT' ? (o.checkoutAt ?? at(departure, faker.number.int({ min: 8, max: 10 }), faker.number.int({ min: 0, max: 59 }))) : null;
    const code = `RB-${randomCode(5)}`;
    const r = await prisma.reservation.create({
      data: {
        code,
        status: o.status,
        source: o.source,
        contactId: o.contactId,
        ratePlanId: plan!.id,
        arrival: day(o.arrival),
        departure: day(departure),
        adults: faker.number.int({ min: 1, max: 2 }),
        children: faker.datatype.boolean(0.15) ? 1 : 0,
        currency: 'UGX',
        totalMinor: total,
        paidMinor: paid,
        depositMinor: deposit,
        cancellationSnapshot: { rules: policy!.rules ?? [], text: policy!.text ?? {} },
        confirmedAt: created,
        checkedInAt: checkedIn,
        checkedInById: ids.deskId,
        checkedOutAt: checkedOut,
        checkedOutById: checkedOut ? ids.deskId : null,
        createdById: o.source === 'DIRECT' ? null : ids.deskId,
        createdAt: created,
        isSeed: true,
        rooms: { create: { roomTypeId: o.room.roomTypeId, quantity: 1, nightly: nightly.map((n) => ({ date: n.date, amountMinor: n.amountMinor.toString() })) } },
        folio: {
          create: {
            currency: 'UGX',
            isClosed: o.status === 'CHECKED_OUT',
            lines: {
              create: [
                ...nightly.map((n) => ({ kind: 'ROOM' as const, description: `${(o.room.roomType.name as { en: string }).en} × 1 — Bed & breakfast`, date: day(n.date), amountMinor: n.amountMinor, createdAt: at(n.date, 12) })),
                ...extras.map((e) => ({ kind: 'FNB' as const, description: e.description, date: day(e.date), amountMinor: e.amount, postedById: ids.deskId, createdAt: at(e.date, 21) })),
              ],
            },
          },
        },
        changes: {
          create: [
            { kind: 'created', summary: `Booked ${o.nights} night(s)`, createdAt: created },
            { kind: 'checked_in', summary: `Checked in — room ${o.room.number}`, actorId: ids.deskId, createdAt: checkedIn },
            ...(checkedOut ? [{ kind: 'checked_out', summary: 'Checked out', actorId: ids.deskId, createdAt: checkedOut }] : []),
          ],
        },
      },
      include: { rooms: true, folio: true },
    });
    await prisma.roomAssignment.create({ data: { reservationId: r.id, reservationRoomId: r.rooms[0]!.id, roomId: o.room.id, fromDate: day(o.arrival), toDate: day(departure), releasedAt: checkedOut, createdById: ids.deskId, createdAt: checkedIn } });
    const payments = paid === total && o.source !== 'WALK_IN' ? [deposit, total - deposit] : [paid];
    for (const [k, amount] of payments.entries()) {
      if (amount <= 0n) continue;
      const when = k === 0 && payments.length > 1 ? created : checkedIn;
      const method = faker.helpers.arrayElement(['MOBILE_MONEY', 'MOBILE_MONEY', 'CASH', 'CARD'] as const);
      const intent = await prisma.paymentIntent.create({ data: { reservationId: r.id, purpose: payments.length > 1 ? (k === 0 ? 'DEPOSIT' : 'BALANCE') : 'FULL', amountMinor: amount, currency: 'UGX', provider: k === 0 && o.source === 'DIRECT' ? 'TEST' : 'MANUAL', method, status: 'SUCCEEDED', merchantReference: `${code}-P${k + 1}`, paidAt: when, confirmationCode: `SEEDH${k}`, createdAt: when } });
      await prisma.folioLine.create({ data: { folioId: r.folio!.id, kind: 'PAYMENT', description: `Payment ${intent.merchantReference} — ${method.toLowerCase().replace('_', ' ')}`, date: day(when.toISOString().slice(0, 10)), amountMinor: -amount, paymentId: intent.id, createdAt: when } });
    }
    if (o.feedback && checkedOut) {
      await prisma.feedback.create({ data: { reservationId: r.id, score: o.feedback.score, comment: o.feedback.comment, allowPublic: o.feedback.allowPublic, handledAt: o.feedback.handled ? new Date(checkedOut.getTime() + 86_400_000) : null, handledById: o.feedback.handled ? ids.ownerId : null, isSeed: true, createdAt: new Date(checkedOut.getTime() + 5 * 3600_000) } });
    }
    return r;
  }

  const pickFeedback = () => {
    if (!faker.datatype.boolean(0.6)) return null;
    const x = faker.number.float();
    const score = x < 0.72 ? 'GOOD' : x < 0.92 ? 'OK' : 'BAD';
    const comment = faker.datatype.boolean(0.8) ? faker.helpers.arrayElement(score === 'GOOD' ? GOOD : score === 'OK' ? OK : BAD) : null;
    return { score, comment, allowPublic: score === 'GOOD' && !!comment && faker.datatype.boolean(0.6), handled: score !== 'GOOD' && faker.datatype.boolean(0.5) } as const;
  };

  let made = 0;
  // A handful of returning guests: two or three stays each.
  const regulars = contacts.slice(0, 6);
  const guestFor = (i: number) => (i % 3 === 0 ? regulars[i % regulars.length]! : contacts[(i * 7) % contacts.length]!);

  // Guests in the house tonight (placed first so they get rooms).
  const inHouse = [
    { back: 2, nights: 2, fnb: 2 }, // due out today
    { back: 1, nights: 3, fnb: 1 },
    { back: 3, nights: 5, fnb: 3 },
  ];
  for (const [k, h] of inHouse.entries()) {
    const arrival = addDays(today, -h.back);
    for (const room of faker.helpers.shuffle(rooms)) {
      const r = await stay({ contactId: regulars[k]!.id, room, arrival, nights: h.nights, status: 'IN_HOUSE', source: k === 2 ? 'WALK_IN' : 'WHATSAPP', paidAll: k !== 0, fnb: h.fnb });
      if (r) {
        await prisma.room.update({ where: { id: room.id }, data: { hkStatus: 'OCCUPIED' } });
        made++;
        break;
      }
    }
  }

  // This morning's departures: one room still dirty, one already cleaned.
  const departedToday: string[] = [];
  for (const [k, n] of [2, 1].entries()) {
    const arrival = addDays(today, -n);
    for (const room of faker.helpers.shuffle(rooms)) {
      if (busy.get(room.id)!.has(today)) continue;
      const r = await stay({ contactId: contacts[10 + k]!.id, room, arrival, nights: n, status: 'CHECKED_OUT', source: 'DIRECT', checkoutAt: at(today, 9 + k, 15), feedback: k === 0 ? { score: 'GOOD', comment: GOOD[0]!, allowPublic: true, handled: false } : null });
      if (r) {
        departedToday.push(room.id);
        made++;
        break;
      }
    }
  }

  // Three months of history.
  for (let i = 0; i < 60 && made < 44; i++) {
    const nights = faker.helpers.weightedArrayElement([{ value: 1, weight: 3 }, { value: 2, weight: 4 }, { value: 3, weight: 2 }, { value: 4, weight: 1 }, { value: 7, weight: 0.4 }]);
    const arrival = addDays(today, -faker.number.int({ min: nights + 1, max: 92 }));
    const room = faker.helpers.arrayElement(rooms);
    const r = await stay({ contactId: guestFor(i).id, room, arrival, nights, status: 'CHECKED_OUT', source: faker.helpers.weightedArrayElement([{ value: 'DIRECT' as const, weight: 5 }, { value: 'WHATSAPP' as const, weight: 3 }, { value: 'PHONE' as const, weight: 2 }, { value: 'WALK_IN' as const, weight: 1 }]), fnb: faker.number.int({ min: 0, max: 2 }), feedback: pickFeedback() });
    if (r) made++;
  }

  // Room status for today.
  const [dirty, cleaned] = departedToday;
  if (dirty) {
    await prisma.room.update({ where: { id: dirty }, data: { hkStatus: 'VACANT_DIRTY' } });
    await prisma.housekeepingTask.create({ data: { roomId: dirty, date: day(today), kind: 'DEPARTURE', status: 'TODO', priority: 1, assigneeId: ids.housekeepingId, isSeed: true } });
  }
  if (cleaned) {
    await prisma.room.update({ where: { id: cleaned }, data: { hkStatus: 'VACANT_CLEAN' } });
    await prisma.housekeepingTask.create({ data: { roomId: cleaned, date: day(today), kind: 'DEPARTURE', status: 'DONE', assigneeId: ids.housekeepingId, startedAt: at(today, 10, 5), completedAt: at(today, 10, 50), completedById: ids.housekeepingId, isSeed: true } });
  }
  const spare = rooms.filter((r) => !busy.get(r.id)!.has(today) && !departedToday.includes(r.id));
  if (spare[0]) await prisma.room.update({ where: { id: spare[0].id }, data: { hkStatus: 'INSPECTED' } });

  // Maintenance: a room off sale for a few nights, if its type can spare it.
  const blockNights = nightsOf(today, 4);
  for (const room of spare.slice(1).reverse()) {
    if (!free(room.id, blockNights)) continue;
    await prisma.inventoryDay.createMany({ data: blockNights.map((d) => ({ roomTypeId: room.roomTypeId, date: day(d), totalRooms: capacity.get(room.roomTypeId) ?? 0 })), skipDuplicates: true });
    const rows = await prisma.inventoryDay.findMany({ where: { roomTypeId: room.roomTypeId, date: { in: blockNights.map(day) } } });
    if (rows.some((r) => r.totalRooms - r.soldRooms - r.heldRooms - r.blockedRooms < 1)) continue;
    await prisma.inventoryDay.updateMany({ where: { roomTypeId: room.roomTypeId, date: { in: blockNights.map(day) } }, data: { blockedRooms: { increment: 1 } } });
    await prisma.roomBlock.create({ data: { roomId: room.id, fromDate: day(today), toDate: day(addDays(today, 4)), reason: 'MAINTENANCE', note: 'Shower mixer being replaced; plumber from Mbale on Thursday', createdById: ids.ownerId } });
    await prisma.room.update({ where: { id: room.id }, data: { hkStatus: 'OUT_OF_ORDER' } });
    break;
  }

  // Guest memory.
  const memory = [
    { tags: ['returning', 'runner'], guestNotes: 'Trains at altitude every season. Breakfast at 5:30, no dairy.', isVip: false },
    { tags: ['returning', 'coffee'], guestNotes: 'Likes the upper floor facing the ridge. Takes coffee black.', isVip: true },
    { tags: ['family'], guestNotes: 'Travels with a toddler: cot in the room before arrival.', isVip: false },
  ];
  for (const [k, m] of memory.entries()) await prisma.contact.update({ where: { id: regulars[k]!.id }, data: { ...m, nationality: k === 1 ? 'Kenyan' : 'Ugandan' } });

  // Someone who booked twice under slightly different details.
  const a = await prisma.contact.create({ data: { name: 'Grace Chebet', phone: '+256772410988', email: 'grace.chebet@example.com', country: 'UG', source: 'WHATSAPP', whatsappOptIn: true, isSeed: true } });
  const b = await prisma.contact.create({ data: { name: 'Chebet Grace', email: 'grace.chebet@example.com', country: 'UG', source: 'WEB', isSeed: true } });
  for (const [k, c] of [a, b].entries()) {
    for (const room of faker.helpers.shuffle(rooms)) {
      if (await stay({ contactId: c.id, room, arrival: addDays(today, -(40 + k * 25)), nights: 2, status: 'CHECKED_OUT', source: k ? 'DIRECT' : 'WHATSAPP', feedback: null })) break;
    }
  }

  log('house', `${made} stays, ${inHouse.length} in the house, room rack and guest memory`);
}

/** Two guests due today, so the front desk has someone to welcome. Guarded on its own. */
export async function seedArrivalsToday(deskId: string) {
  const today = hotelToday();
  if (await prisma.reservation.count({ where: { isSeed: true, arrival: day(today), status: { in: ['CONFIRMED', 'IN_HOUSE'] } } })) return log('arrivals', 'exists, skipped');
  faker.seed(1930);
  const plan = await prisma.ratePlan.findFirst({ where: { code: 'BB' } });
  const policy = await prisma.cancellationPolicy.findFirst({ where: { isDefault: true } });
  if (!plan || !policy) return;
  const contacts = await prisma.contact.findMany({ where: { isSeed: true, mergedIntoId: null }, orderBy: { createdAt: 'asc' }, skip: 14, take: 2 });
  const rooms = await prisma.room.findMany({ where: { isActive: true, hkStatus: { in: ['VACANT_CLEAN', 'INSPECTED'] } }, include: { roomType: true }, orderBy: { number: 'asc' } });
  let made = 0;
  for (const [k, c] of contacts.entries()) {
    const nights = [today, addDays(today, 1)];
    for (const room of rooms) {
      const taken = await prisma.roomAssignment.count({ where: { roomId: room.id, releasedAt: null, fromDate: { lt: day(addDays(today, 2)) }, toDate: { gt: day(today) } } });
      if (taken) continue;
      const typeCount = await prisma.room.count({ where: { roomTypeId: room.roomTypeId, isActive: true } });
      await prisma.inventoryDay.createMany({ data: nights.map((d) => ({ roomTypeId: room.roomTypeId, date: day(d), totalRooms: typeCount })), skipDuplicates: true });
      const inv = await prisma.inventoryDay.findMany({ where: { roomTypeId: room.roomTypeId, date: { in: nights.map(day) } } });
      if (inv.length < 2 || inv.some((r) => r.totalRooms - r.soldRooms - r.heldRooms - r.blockedRooms < 1)) continue;
      const rates = await prisma.rate.findMany({ where: { ratePlanId: plan.id, roomTypeId: room.roomTypeId, currency: 'UGX', date: { in: nights.map(day) } }, orderBy: { date: 'asc' } });
      if (rates.length < 2) continue;
      const total = rates.reduce((a, r) => a + r.amountMinor, 0n);
      const deposit = ((total * 30n) / 100n + 999n) / 1000n * 1000n;
      const code = `RB-${randomCode(5)}`;
      const created = new Date(Date.now() - (5 + k * 9) * 86_400_000);
      const r = await prisma.reservation.create({
        data: {
          code, status: 'CONFIRMED', source: k ? 'DIRECT' : 'PHONE', contactId: c.id, ratePlanId: plan.id, arrival: day(today), departure: day(addDays(today, 2)),
          adults: 2, children: k, currency: 'UGX', totalMinor: total, paidMinor: deposit, depositMinor: deposit,
          cancellationSnapshot: { rules: policy.rules ?? [], text: policy.text ?? {} }, eta: k ? 'After 18:00' : '15:00',
          guestNotes: k ? 'Arriving by bus to Mbale — can you arrange a pick-up?' : 'Celebrating an anniversary', confirmedAt: created, createdById: k ? null : deskId, createdAt: created, isSeed: true,
          rooms: { create: { roomTypeId: room.roomTypeId, quantity: 1, nightly: rates.map((x) => ({ date: x.date.toISOString().slice(0, 10), amountMinor: x.amountMinor.toString() })) } },
          folio: { create: { currency: 'UGX', lines: { create: rates.map((x) => ({ kind: 'ROOM' as const, description: `${(room.roomType.name as { en: string }).en} × 1 — Bed & breakfast`, date: x.date, amountMinor: x.amountMinor })) } } },
          changes: { create: { kind: 'created', summary: 'Booked 2 night(s)', createdAt: created } },
        },
        include: { rooms: true, folio: true },
      });
      const intent = await prisma.paymentIntent.create({ data: { reservationId: r.id, purpose: 'DEPOSIT', amountMinor: deposit, currency: 'UGX', provider: k ? 'TEST' : 'MANUAL', method: 'MOBILE_MONEY', status: 'SUCCEEDED', merchantReference: `${code}-P1`, paidAt: created, confirmationCode: 'SEEDA', createdAt: created } });
      await prisma.folioLine.create({ data: { folioId: r.folio!.id, kind: 'PAYMENT', description: `Payment ${intent.merchantReference} — mobile money`, date: day(created.toISOString().slice(0, 10)), amountMinor: -deposit, paymentId: intent.id } });
      await prisma.inventoryDay.updateMany({ where: { roomTypeId: room.roomTypeId, date: { in: nights.map(day) } }, data: { soldRooms: { increment: 1 } } });
      // The first one already has its room given, the second waits for the desk.
      if (k === 0) await prisma.roomAssignment.create({ data: { reservationId: r.id, reservationRoomId: r.rooms[0]!.id, roomId: room.id, fromDate: day(today), toDate: day(addDays(today, 2)), createdById: deskId } });
      made++;
      break;
    }
  }
  log('arrivals', `${made} due today`);
}
