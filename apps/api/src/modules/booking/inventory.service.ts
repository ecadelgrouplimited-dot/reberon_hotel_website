import { Injectable } from '@nestjs/common';
import type { Prisma } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';

export type Tx = Prisma.TransactionClient;

export const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Every night of a stay: arrival inclusive, departure exclusive. */
export function nightsOf(arrival: string, departure: string): string[] {
  const out: string[] = [];
  for (let d = day(arrival); d < day(departure); d = new Date(d.getTime() + 86_400_000)) out.push(iso(d));
  return out;
}

/**
 * Room inventory per room type per night. The only writes that sell or hold
 * rooms are single conditional UPDATEs, so two guests racing for the last
 * room cannot both succeed; the database CHECK constraint is the backstop.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Make sure inventory rows exist for these nights (total = active physical rooms of the type). */
  async ensure(roomTypeIds: string[], dates: string[], tx: Tx = this.prisma) {
    if (!roomTypeIds.length || !dates.length) return;
    const counts = await tx.room.groupBy({ by: ['roomTypeId'], where: { roomTypeId: { in: roomTypeIds }, isActive: true }, _count: true });
    const total = new Map(counts.map((c) => [c.roomTypeId, c._count]));
    await tx.inventoryDay.createMany({
      data: roomTypeIds.flatMap((roomTypeId) => dates.map((d) => ({ roomTypeId, date: day(d), totalRooms: total.get(roomTypeId) ?? 0 }))),
      skipDuplicates: true,
    });
  }

  async days(roomTypeIds: string[], dates: string[], tx: Tx = this.prisma) {
    await this.ensure(roomTypeIds, dates, tx);
    return tx.inventoryDay.findMany({ where: { roomTypeId: { in: roomTypeIds }, date: { gte: day(dates[0]!), lte: day(dates[dates.length - 1]!) } }, orderBy: { date: 'asc' } });
  }

  /** Rooms free on every night of the stay (the minimum across nights). */
  freeAcross(rows: { soldRooms: number; heldRooms: number; blockedRooms: number; totalRooms: number; stopSell: boolean }[]) {
    if (!rows.length) return 0;
    return Math.min(...rows.map((r) => (r.stopSell ? 0 : r.totalRooms - r.soldRooms - r.heldRooms - r.blockedRooms)));
  }

  /** Atomically hold rooms for every night, or throw. */
  async hold(tx: Tx, roomTypeId: string, dates: string[], rooms: number) {
    await this.ensure([roomTypeId], dates, tx);
    const updated = await tx.$executeRaw`
      UPDATE "InventoryDay" SET "heldRooms" = "heldRooms" + ${rooms}, "updatedAt" = now()
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}
        AND "stopSell" = false AND "totalRooms" - "soldRooms" - "heldRooms" - "blockedRooms" >= ${rooms}`;
    if (updated !== dates.length) throw new InventoryUnavailable();
  }

  /** Straight to sold (desk bookings confirmed on the spot). */
  async sell(tx: Tx, roomTypeId: string, dates: string[], rooms: number) {
    await this.ensure([roomTypeId], dates, tx);
    const updated = await tx.$executeRaw`
      UPDATE "InventoryDay" SET "soldRooms" = "soldRooms" + ${rooms}, "updatedAt" = now()
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}
        AND "totalRooms" - "soldRooms" - "heldRooms" - "blockedRooms" >= ${rooms}`;
    if (updated !== dates.length) throw new InventoryUnavailable();
  }

  async convertHeldToSold(tx: Tx, roomTypeId: string, dates: string[], rooms: number) {
    await tx.$executeRaw`
      UPDATE "InventoryDay" SET "heldRooms" = "heldRooms" - ${rooms}, "soldRooms" = "soldRooms" + ${rooms}, "updatedAt" = now()
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}`;
  }

  /** Take one physical room off sale for these nights; returns the nights that were already full. */
  async block(tx: Tx, roomTypeId: string, dates: string[]) {
    await this.ensure([roomTypeId], dates, tx);
    const full = await tx.$queryRaw<{ date: Date }[]>`
      SELECT date FROM "InventoryDay"
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}
        AND "totalRooms" - "soldRooms" - "heldRooms" - "blockedRooms" < 1
      ORDER BY date FOR UPDATE`;
    if (full.length) return full.map((f) => iso(f.date));
    const updated = await tx.$executeRaw`
      UPDATE "InventoryDay" SET "blockedRooms" = "blockedRooms" + 1, "updatedAt" = now()
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}
        AND "totalRooms" - "soldRooms" - "heldRooms" - "blockedRooms" >= 1`;
    if (updated !== dates.length) throw new InventoryUnavailable();
    return [];
  }

  async unblock(tx: Tx, roomTypeId: string, dates: string[]) {
    if (!dates.length) return;
    await tx.$executeRaw`UPDATE "InventoryDay" SET "blockedRooms" = GREATEST(0, "blockedRooms" - 1), "updatedAt" = now()
      WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}`;
  }

  async release(tx: Tx, roomTypeId: string, dates: string[], rooms: number, from: 'held' | 'sold') {
    if (from === 'held') {
      await tx.$executeRaw`UPDATE "InventoryDay" SET "heldRooms" = GREATEST(0, "heldRooms" - ${rooms}), "updatedAt" = now()
        WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}`;
    } else {
      await tx.$executeRaw`UPDATE "InventoryDay" SET "soldRooms" = GREATEST(0, "soldRooms" - ${rooms}), "updatedAt" = now()
        WHERE "roomTypeId" = ${roomTypeId}::uuid AND date >= ${day(dates[0]!)} AND date <= ${day(dates[dates.length - 1]!)}`;
    }
  }
}

export class InventoryUnavailable extends Error {
  constructor() {
    super('Those rooms were just taken for some of your nights.');
  }
}
