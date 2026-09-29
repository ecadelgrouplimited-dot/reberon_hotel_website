import { Injectable } from '@nestjs/common';
import type { FeedbackScore, HouseReportDTO, MoneyByCurrency } from '@reberon/contracts';
import { PrismaService } from '../../common/prisma.service.js';
import { badRequest } from '../../common/errors.js';
import { BookingService } from '../booking/booking.service.js';
import { day, iso, nightsOf } from '../booking/inventory.service.js';

type Cur = 'UGX' | 'USD';
const zero = (): Record<Cur, bigint> => ({ UGX: 0n, USD: 0n });
const out = (m: Record<Cur, bigint>): MoneyByCurrency => ({ UGX: m.UGX.toString(), USD: m.USD.toString() });
const SOLD = ['CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT'] as const;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/**
 * The owner's numbers (M21). Room nights come from the frozen nightly rates, so a
 * rate change never rewrites the past. UGX and USD are summed separately.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingService,
  ) {}

  async house(from: string, to: string): Promise<HouseReportDTO> {
    const dates = nightsOf(from, iso(new Date(day(to).getTime() + 86_400_000)));
    if (dates.length > 400) throw badRequest('Choose up to about a year at a time');
    const start = day(from);
    const endExcl = new Date(day(to).getTime() + 86_400_000);

    const [rooms, blocks, stays, created, cancelled, noShows, lines, payments, refunds, feedback, names] = await Promise.all([
      this.prisma.room.findMany({ where: { isActive: true }, select: { id: true, roomTypeId: true } }),
      this.prisma.roomBlock.findMany({ where: { fromDate: { lt: endExcl }, toDate: { gt: start } }, include: { room: { select: { roomTypeId: true } } } }),
      this.prisma.reservation.findMany({ where: { status: { in: [...SOLD] }, arrival: { lt: endExcl }, departure: { gt: start } }, include: { rooms: true } }),
      this.prisma.reservation.findMany({ where: { createdAt: { gte: start, lt: endExcl }, status: { notIn: ['HELD', 'EXPIRED'] } }, select: { createdAt: true, arrival: true } }),
      this.prisma.reservation.count({ where: { cancelledAt: { gte: start, lt: endExcl } } }),
      this.prisma.reservation.count({ where: { status: 'NO_SHOW', arrival: { gte: start, lt: endExcl } } }),
      this.prisma.folioLine.findMany({ where: { kind: { in: ['EXTRA', 'PACKAGE', 'FNB'] }, date: { gte: start, lt: endExcl }, folio: { reservation: { status: { in: [...SOLD] } } } }, include: { folio: { select: { currency: true } } } }),
      this.prisma.paymentIntent.findMany({ where: { status: 'SUCCEEDED', paidAt: { gte: start, lt: endExcl } }, select: { amountMinor: true, currency: true } }),
      this.prisma.folioLine.findMany({ where: { kind: 'REFUND', date: { gte: start, lt: endExcl } }, include: { folio: { select: { currency: true } } } }),
      this.prisma.feedback.groupBy({ by: ['score'], where: { createdAt: { gte: start, lt: endExcl } }, _count: true }),
      this.booking.roomTypeNames(),
    ]);

    const inRange = new Set(dates);
    const sold = new Map<string, number>(dates.map((d) => [d, 0]));
    const soldByType = new Map<string, number>();
    const revenue = zero();
    const nightsByCur: Record<Cur, number> = { UGX: 0, USD: 0 };
    const source = new Map<string, { bookings: number; roomNights: number }>();
    let staysArriving = 0;
    let nightsArriving = 0;

    for (const r of stays) {
      const cur = r.currency as Cur;
      // An early departure frees the unslept nights, which are no longer sold.
      const lastNight = r.status === 'CHECKED_OUT' && r.checkedOutAt ? iso(r.checkedOutAt) : null;
      let mine = 0;
      for (const rr of r.rooms) {
        for (const n of rr.nightly as { date: string; amountMinor: string }[]) {
          if (!inRange.has(n.date)) continue;
          if (lastNight && n.date >= lastNight && lastNight < iso(r.departure)) continue;
          sold.set(n.date, (sold.get(n.date) ?? 0) + rr.quantity);
          soldByType.set(rr.roomTypeId, (soldByType.get(rr.roomTypeId) ?? 0) + rr.quantity);
          revenue[cur] += BigInt(n.amountMinor) * BigInt(rr.quantity);
          nightsByCur[cur] += rr.quantity;
          mine += rr.quantity;
        }
      }
      const s = source.get(r.source) ?? { bookings: 0, roomNights: 0 };
      s.bookings += 1;
      s.roomNights += mine;
      source.set(r.source, s);
      if (iso(r.arrival) >= from && iso(r.arrival) <= to) {
        staysArriving += 1;
        nightsArriving += nightsOf(iso(r.arrival), iso(r.departure)).length;
      }
    }

    const typeRooms = new Map<string, number>();
    for (const r of rooms) typeRooms.set(r.roomTypeId, (typeRooms.get(r.roomTypeId) ?? 0) + 1);
    const blockedOn = (d: string, typeId?: string) => blocks.filter((b) => iso(b.fromDate) <= d && iso(b.toDate) > d && (!b.releasedAt || iso(b.releasedAt) > d) && (!typeId || b.room.roomTypeId === typeId)).length;

    const days = dates.map((d) => {
      const available = rooms.length - blockedOn(d);
      const s = sold.get(d) ?? 0;
      return { date: d, available, sold: s, occupancy: pct(s, available) };
    });
    const roomNightsAvailable = days.reduce((a, d) => a + d.available, 0);
    const roomNightsSold = days.reduce((a, d) => a + d.sold, 0);

    const other = zero();
    for (const l of lines) other[l.folio.currency as Cur] += l.amountMinor;
    const collected = zero();
    for (const p of payments) collected[p.currency as Cur] += p.amountMinor;
    for (const l of refunds) collected[l.folio.currency as Cur] -= l.amountMinor;

    const adr = zero();
    const revpar = zero();
    for (const c of ['UGX', 'USD'] as Cur[]) {
      adr[c] = nightsByCur[c] ? revenue[c] / BigInt(nightsByCur[c]) : 0n;
      revpar[c] = roomNightsAvailable ? revenue[c] / BigInt(roomNightsAvailable) : 0n;
    }

    const buckets = [
      { bucket: 'Same day', max: 0 },
      { bucket: '1–7 days', max: 7 },
      { bucket: '8–30 days', max: 30 },
      { bucket: '31–90 days', max: 90 },
      { bucket: '90+ days', max: Infinity },
    ].map((b) => ({ ...b, bookings: 0 }));
    for (const r of created) {
      const lead = Math.max(0, Math.round((r.arrival.getTime() - day(iso(r.createdAt)).getTime()) / 86_400_000));
      buckets.find((b) => lead <= b.max)!.bookings += 1;
    }

    // Returning: the guest had a completed stay before this arrival.
    const arriving = stays.filter((r) => iso(r.arrival) >= from && iso(r.arrival) <= to);
    const returningGuests = arriving.length
      ? (
          await Promise.all(
            arriving.map((r) => this.prisma.reservation.count({ where: { contactId: r.contactId, status: 'CHECKED_OUT', departure: { lte: r.arrival }, id: { not: r.id } } })),
          )
        ).filter((n) => n > 0).length
      : 0;

    const fb = Object.fromEntries((['GOOD', 'OK', 'BAD'] as FeedbackScore[]).map((s) => [s, feedback.find((f) => f.score === s)?._count ?? 0])) as Record<FeedbackScore, number>;

    return {
      from,
      to,
      days,
      totals: {
        roomNightsAvailable,
        roomNightsSold,
        occupancy: pct(roomNightsSold, roomNightsAvailable),
        roomRevenue: out(revenue),
        adr: out(adr),
        revpar: out(revpar),
        otherRevenue: out(other),
        collected: out(collected),
        averageStay: staysArriving ? Math.round((nightsArriving / staysArriving) * 10) / 10 : 0,
        bookings: created.length,
        cancellations: cancelled,
        noShows,
        returningGuests,
      },
      sourceMix: [...source.entries()].map(([s, v]) => ({ source: s, ...v })).sort((a, b) => b.roomNights - a.roomNights),
      roomTypes: [...typeRooms.entries()].map(([id, count]) => {
        const avail = dates.reduce((a, d) => a + count - blockedOn(d, id), 0);
        const s = soldByType.get(id) ?? 0;
        return { id, name: names.get(id) ?? 'Room', roomNightsSold: s, occupancy: pct(s, avail) };
      }),
      leadTime: buckets.map(({ bucket, bookings }) => ({ bucket, bookings })),
      feedback: fb,
      currencyNote: 'UGX and USD are counted separately and never converted. ADR divides each currency by the nights sold in it; RevPAR divides by every available room night.',
    };
  }
}
