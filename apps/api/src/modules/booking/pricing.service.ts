import { Injectable } from '@nestjs/common';
import type { AvailabilityDTO, CurrencyCode, ExtraDTO, OfferDTO, OfferPlanDTO } from '@reberon/contracts';
import type { Extra, RatePlan, CancellationPolicy } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { lt, toMediaRef } from '../content/mappers.js';
import { InventoryService, day, iso, nightsOf, type Tx } from './inventory.service.js';

export interface PolicyRule {
  daysBefore: number;
  refundPercent: number;
}

/** Deposits round up to a clean figure a guest can type into a phone: UGX 1,000s, whole dollars. */
export function roundDeposit(amount: bigint, currency: CurrencyCode) {
  const step = currency === 'UGX' ? 1000n : 100n;
  return ((amount + step - 1n) / step) * step;
}

export function extraTotal(e: Pick<Extra, 'unit' | 'priceUgx' | 'priceUsd'>, currency: CurrencyCode, qty: number, nights: number): bigint | null {
  const unit = currency === 'UGX' ? e.priceUgx : e.priceUsd;
  if (unit === null || unit === undefined) return null;
  const mult = e.unit === 'PER_NIGHT' ? BigInt(qty * nights) : BigInt(qty);
  return unit * mult;
}

export function toExtraDTO(e: Extra): ExtraDTO {
  return { id: e.id, slug: e.slug, name: lt(e.name), summary: lt(e.summary), kind: e.kind, unit: e.unit, price: { ugx: e.priceUgx.toString(), usd: e.priceUsd?.toString() ?? null }, isExperience: e.isExperience };
}

export interface Quote {
  nights: string[];
  nightly: { date: string; amountMinor: bigint }[];
  roomTotal: bigint;
  plan: RatePlan & { cancellationPolicy: CancellationPolicy | null };
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /** Price one room of a type on a plan for the stay; null + reason when it cannot be sold. */
  async quotePlan(tx: Tx, plan: RatePlan & { cancellationPolicy: CancellationPolicy | null }, roomTypeId: string, arrival: string, departure: string, currency: CurrencyCode): Promise<{ quote: Quote | null; reason: string | null }> {
    const nights = nightsOf(arrival, departure);
    if (nights.length < plan.minNights) return { quote: null, reason: `Minimum ${plan.minNights} nights on this rate` };
    const rates = await tx.rate.findMany({ where: { ratePlanId: plan.id, roomTypeId, currency, date: { gte: day(nights[0]!), lte: day(nights[nights.length - 1]!) } } });
    const byDate = new Map(rates.map((r) => [iso(r.date), r.amountMinor]));
    const missing = nights.filter((n) => !byDate.has(n));
    if (missing.length) return { quote: null, reason: currency === 'USD' ? 'No USD price for some of these nights — try UGX' : 'Not yet open for booking on some of these nights' };
    const nightly = nights.map((date) => ({ date, amountMinor: byDate.get(date)! }));
    return { quote: { nights, nightly, roomTotal: nightly.reduce((a, n) => a + n.amountMinor, 0n), plan }, reason: null };
  }

  async availability(q: { arrival: string; departure: string; adults: number; children: number; currency: CurrencyCode }): Promise<AvailabilityDTO> {
    const nights = nightsOf(q.arrival, q.departure);
    const [roomTypes, plans, extras, tax] = await Promise.all([
      this.prisma.roomType.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, include: { hero: true }, orderBy: { order: 'asc' } }),
      this.prisma.ratePlan.findMany({ where: { isActive: true, isPublic: true }, include: { cancellationPolicy: true }, orderBy: { order: 'asc' } }),
      this.prisma.extra.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, orderBy: { order: 'asc' } }),
      this.prisma.taxRule.findFirst({ where: { isActive: true } }),
    ]);
    const inv = await this.inventory.days(roomTypes.map((r) => r.id), nights);
    const arrivalRows = inv.filter((r) => iso(r.date) === q.arrival);

    const offers: OfferDTO[] = [];
    for (const rt of roomTypes) {
      const rows = inv.filter((r) => r.roomTypeId === rt.id);
      const available = this.inventory.freeAcross(rows);
      const perRoom = rt.sleepsAdults + rt.sleepsChildren;
      const roomsNeeded = Math.max(Math.ceil(q.adults / rt.sleepsAdults), Math.ceil((q.adults + q.children) / perRoom));
      const arrivalRow = arrivalRows.find((r) => r.roomTypeId === rt.id);
      const minStay = Math.max(...rows.map((r) => (iso(r.date) === q.arrival ? (r.minStay ?? 1) : 1)), 1);
      let reason: string | null = null;
      if (arrivalRow?.closedToArrival) reason = 'No arrivals on this date';
      else if (nights.length < minStay) reason = `Minimum ${minStay} nights from this date`;
      else if (available < roomsNeeded) reason = available <= 0 ? 'Full on some of these nights' : `Only ${available} left — your party needs ${roomsNeeded}`;
      const planOffers: OfferPlanDTO[] = [];
      if (!reason) {
        for (const plan of plans) {
          const { quote } = await this.quotePlan(this.prisma, plan, rt.id, q.arrival, q.departure, q.currency);
          if (!quote) continue;
          const total = quote.roomTotal * BigInt(roomsNeeded);
          planOffers.push({
            ratePlanId: plan.id,
            code: plan.code,
            name: lt(plan.name),
            description: lt(plan.description),
            mealPlan: plan.mealPlan,
            depositPercent: plan.depositPercent,
            cancellation: lt(plan.cancellationPolicy?.text),
            nightly: quote.nightly.map((n) => ({ date: n.date, amountMinor: n.amountMinor.toString() })),
            totalMinor: total.toString(),
            depositMinor: roundDeposit((total * BigInt(plan.depositPercent)) / 100n, q.currency).toString(),
          });
        }
        if (!planOffers.length) reason = q.currency === 'USD' ? 'No USD prices for these dates — switch to UGX' : 'Not yet open for booking on these dates';
      }
      offers.push({
        roomType: { id: rt.id, slug: rt.slug, name: lt(rt.name), tagline: lt(rt.tagline), sleepsAdults: rt.sleepsAdults, sleepsChildren: rt.sleepsChildren, bedConfig: lt(rt.bedConfig), hero: rt.hero ? toMediaRef(rt.hero) : null },
        available: Math.max(0, available),
        roomsNeeded,
        plans: planOffers,
        unavailableReason: reason,
      });
    }
    return {
      arrival: q.arrival,
      departure: q.departure,
      nights: nights.length,
      currency: q.currency,
      offers,
      extras: extras.filter((e) => q.currency === 'UGX' || e.priceUsd !== null).map(toExtraDTO),
      taxNote: tax ? { en: `Prices include ${Number(tax.ratePercent)}% VAT. The price you see is the price you pay.` } : { en: 'The price you see is the price you pay.' },
    };
  }

  /** Refund percentage that applies if a stay is cancelled today (Kampala dates). */
  refundPercent(rules: PolicyRule[], arrival: string, today: string) {
    const days = Math.round((day(arrival).getTime() - day(today).getTime()) / 86_400_000);
    const sorted = [...rules].sort((a, b) => b.daysBefore - a.daysBefore);
    return { days, percent: sorted.find((r) => days >= r.daysBefore)?.refundPercent ?? 0 };
  }
}
