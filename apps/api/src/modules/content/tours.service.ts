import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { z } from 'zod';
import type { MediaRef, TourAdminDTO, TourDTO, TourSpace, TourStatsDTO, zTourEventInput, zTourInput } from '@reberon/contracts';
import { normalizeTourUrl, t } from '@reberon/contracts';
import type { Prisma } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { CacheService } from '../../common/cache.service.js';
import type { AuthUser } from '../../common/auth.js';
import { conflict, notFound } from '../../common/errors.js';
import { Events } from '../../common/events.js';
import { lt, toMediaRef } from './mappers.js';

const withHotspots = { hotspots: { orderBy: { order: 'asc' as const } }, roomType: { select: { name: true } } } satisfies Prisma.TourInclude;
type TourRow = Prisma.TourGetPayload<{ include: typeof withHotspots }>;
const slotOf = (x: { space: string; roomTypeId: string | null; variant: string | null }) => `${x.space}|${x.roomTypeId ?? ''}|${x.variant ?? ''}`;
const TTL = 300;

/**
 * Virtual exploration (M04). A slot is space + room type + variant. The
 * website shows one tour per slot: a published LIVE tour replaces the
 * PRE_OPENING one without anyone touching the pages that point at it.
 */
@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly events: EventEmitter2,
  ) {}

  private async media(ids: string[]) {
    const rows = ids.length ? await this.prisma.mediaAsset.findMany({ where: { id: { in: [...new Set(ids)] }, status: 'READY' } }) : [];
    return new Map(rows.map((m) => [m.id, toMediaRef(m)]));
  }

  private toDTO(r: TourRow, media: Map<string, MediaRef>): TourDTO {
    return {
      id: r.id,
      slug: r.slug,
      title: lt(r.title),
      summary: lt(r.summary),
      space: r.space,
      roomTypeId: r.roomTypeId,
      variant: r.variant,
      provider: r.provider,
      embedUrl: r.provider === 'DRAWINGS' ? null : r.embedUrl,
      frames: r.provider === 'DRAWINGS' ? r.mediaIds.map((id) => media.get(id)).filter((m): m is MediaRef => !!m) : [],
      poster: (r.posterId && media.get(r.posterId)) || (r.provider === 'DRAWINGS' && r.mediaIds[0] ? (media.get(r.mediaIds[0]) ?? null) : null),
      stage: r.stage,
      hotspots: r.hotspots.map((h) => ({ id: h.id, kind: h.kind, label: lt(h.label), note: lt(h.note), frame: h.frame, x: h.x, y: h.y })),
    };
  }

  /** The tour each slot shows right now (LIVE beats PRE_OPENING; then order). */
  private pickShowing(rows: TourRow[]) {
    const best = new Map<string, TourRow>();
    for (const r of rows) {
      const cur = best.get(slotOf(r));
      const better = !cur || (r.stage === 'LIVE' && cur.stage !== 'LIVE') || (r.stage === cur.stage && (r.order < cur.order || (r.order === cur.order && r.updatedAt > cur.updatedAt)));
      if (better) best.set(slotOf(r), r);
    }
    return best;
  }

  async enabled() {
    return (await this.prisma.setting.findUnique({ where: { key: 'features.toursEnabled' } }))?.value === true;
  }

  /** Every slot's showing tour, for the website. Empty while tours are switched off. */
  async showing(): Promise<TourDTO[]> {
    return this.cache.wrap('tours:showing', ['tours', 'site', 'media'], TTL, async () => {
      if (!(await this.enabled())) return [];
      const rows = await this.prisma.tour.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, include: withHotspots });
      const picked = [...this.pickShowing(rows).values()];
      const media = await this.media(picked.flatMap((r) => [...r.mediaIds, ...(r.posterId ? [r.posterId] : [])]));
      return picked.sort((a, b) => a.order - b.order).map((r) => this.toDTO(r, media));
    });
  }

  async forRoomType(roomTypeId: string) {
    return (await this.showing()).find((x) => x.space === 'ROOM_TYPE' && x.roomTypeId === roomTypeId) ?? null;
  }

  async forSpace(space: TourSpace) {
    return (await this.showing()).filter((x) => x.space === space);
  }

  async recordEvent(id: string, e: z.infer<typeof zTourEventInput>) {
    const exists = await this.prisma.tour.count({ where: { id, status: 'PUBLISHED', deletedAt: null } });
    if (!exists) throw notFound('Tour');
    // One OPENED/COMPLETED per session and tour is enough to count.
    if (e.event === 'OPENED' || e.event === 'COMPLETED') {
      const dup = await this.prisma.tourEvent.count({ where: { tourId: id, sessionId: e.sessionId, event: e.event, createdAt: { gt: new Date(Date.now() - 30 * 60_000) } } });
      if (dup) return { ok: true };
    }
    await this.prisma.tourEvent.create({ data: { tourId: id, sessionId: e.sessionId, event: e.event, context: e.context } });
    return { ok: true };
  }

  /* ───────── admin ───────── */

  private async stats(ids: string[], since: Date): Promise<Map<string, TourStatsDTO>> {
    const events = ids.length ? await this.prisma.tourEvent.findMany({ where: { tourId: { in: ids }, createdAt: { gte: since } }, select: { tourId: true, sessionId: true, event: true } }) : [];
    const sessions = [...new Set(events.filter((e) => e.event === 'OPENED').map((e) => e.sessionId))];
    const bookings = sessions.length ? await this.prisma.reservation.findMany({ where: { tourSessionId: { in: sessions } }, select: { tourSessionId: true, status: true } }) : [];
    const out = new Map<string, TourStatsDTO>();
    for (const id of ids) {
      const mine = events.filter((e) => e.tourId === id);
      const opened = new Set(mine.filter((e) => e.event === 'OPENED').map((e) => e.sessionId));
      const booked = bookings.filter((b) => opened.has(b.tourSessionId!));
      out.set(id, {
        opened: opened.size,
        completed: new Set(mine.filter((e) => e.event === 'COMPLETED').map((e) => e.sessionId)).size,
        hotspots: mine.filter((e) => e.event === 'HOTSPOT').length,
        ctaClicks: mine.filter((e) => e.event === 'CTA_CLICK').length,
        sessions: opened.size,
        startedBooking: new Set(booked.map((b) => b.tourSessionId)).size,
        paid: new Set(booked.filter((b) => ['CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT'].includes(b.status)).map((b) => b.tourSessionId)).size,
      });
    }
    return out;
  }

  async list(days = 90): Promise<TourAdminDTO[]> {
    const rows = await this.prisma.tour.findMany({ where: { deletedAt: null }, include: withHotspots, orderBy: [{ space: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }] });
    const showing = new Set([...this.pickShowing(rows.filter((r) => r.status === 'PUBLISHED')).values()].map((r) => r.id));
    const [media, stats] = await Promise.all([this.media(rows.flatMap((r) => [...r.mediaIds, ...(r.posterId ? [r.posterId] : [])])), this.stats(rows.map((r) => r.id), new Date(Date.now() - days * 86_400_000))]);
    return rows.map((r) => ({
      ...this.toDTO(r, media),
      embedUrl: r.embedUrl,
      status: r.status,
      order: r.order,
      mediaIds: r.mediaIds,
      posterId: r.posterId,
      roomTypeName: r.roomType ? t(lt(r.roomType.name)) : null,
      showing: showing.has(r.id),
      updatedAt: r.updatedAt.toISOString(),
      stats: stats.get(r.id)!,
    }));
  }

  async get(id: string) {
    const all = await this.list();
    const one = all.find((x) => x.id === id);
    if (!one) throw notFound('Tour');
    return one;
  }

  private data(input: z.infer<typeof zTourInput>) {
    const norm = input.provider !== 'DRAWINGS' && input.embedUrl ? normalizeTourUrl(input.provider, input.embedUrl) : null;
    return {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      space: input.space,
      roomTypeId: input.space === 'ROOM_TYPE' ? (input.roomTypeId ?? null) : null,
      variant: input.space === 'HALL' ? (input.variant ?? null) : null,
      provider: input.provider,
      embedUrl: norm && 'url' in norm ? norm.url : null,
      mediaIds: input.provider === 'DRAWINGS' ? input.mediaIds : [],
      posterId: input.posterId ?? null,
      stage: input.stage,
      status: input.status,
      order: input.order,
    };
  }

  private async changed() {
    await this.events.emitAsync(Events.ContentChanged, { tags: ['tours', 'room-types'] });
  }

  async create(input: z.infer<typeof zTourInput>, actor: AuthUser) {
    if (await this.prisma.tour.findUnique({ where: { slug: input.slug } })) throw conflict('A tour already uses that address');
    const tour = await this.prisma.tour.create({
      data: { ...this.data(input), hotspots: { create: input.hotspots.map((h, i) => ({ kind: h.kind, label: h.label, note: h.note, providerRef: h.providerRef ?? null, frame: h.frame ?? null, x: h.x ?? null, y: h.y ?? null, order: i })) } },
    });
    await this.audit.record({ actor, action: 'tour.create', entityType: 'Tour', entityId: tour.id, summary: `Created tour "${t(input.title)}"` });
    await this.changed();
    return this.get(tour.id);
  }

  async update(id: string, input: z.infer<typeof zTourInput>, actor: AuthUser) {
    const before = await this.prisma.tour.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('Tour');
    const clash = await this.prisma.tour.findFirst({ where: { slug: input.slug, id: { not: id } } });
    if (clash) throw conflict('A tour already uses that address');
    await this.prisma.$transaction([
      this.prisma.tourHotspot.deleteMany({ where: { tourId: id } }),
      this.prisma.tour.update({
        where: { id },
        data: { ...this.data(input), hotspots: { create: input.hotspots.map((h, i) => ({ kind: h.kind, label: h.label, note: h.note, providerRef: h.providerRef ?? null, frame: h.frame ?? null, x: h.x ?? null, y: h.y ?? null, order: i })) } },
      }),
    ]);
    const went = before.status !== input.status ? ` · ${input.status.toLowerCase()}` : '';
    const stage = before.stage !== input.stage ? ` · now ${input.stage === 'LIVE' ? 'live' : 'pre-opening'}` : '';
    await this.audit.record({ actor, action: 'tour.update', entityType: 'Tour', entityId: id, summary: `Updated tour "${t(input.title)}"${went}${stage}` });
    await this.changed();
    return this.get(id);
  }

  async remove(id: string, actor: AuthUser) {
    const tour = await this.prisma.tour.findFirst({ where: { id, deletedAt: null } });
    if (!tour) throw notFound('Tour');
    await this.prisma.tour.update({ where: { id }, data: { deletedAt: new Date(), status: 'HIDDEN', slug: `${tour.slug}-deleted-${Date.now()}` } });
    await this.audit.record({ actor, action: 'tour.delete', entityType: 'Tour', entityId: id, summary: `Deleted tour "${t(lt(tour.title))}"` });
    await this.changed();
    return { ok: true };
  }
}
