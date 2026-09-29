import { Injectable } from '@nestjs/common';
import { collectMediaIds, collectRefIds, type Block, type MediaRef, type ResolvedBlock } from '@reberon/contracts';
import { PrismaService } from '../../common/prisma.service.js';
import { toMediaRef, toRoomCard, toFacility, toProgress, toDestinationCard, toFaqGroup, pick, toAmenity, lr } from './mappers.js';

const roomInclude = { hero: true, _count: { select: { rooms: { where: { isActive: true } } } } } as const;

/**
 * Expands block references into render-ready data so the website can draw a
 * page from one response. Only published entities are resolved.
 */
@Injectable()
export class ResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async mediaMap(ids: Iterable<string>): Promise<Map<string, MediaRef>> {
    const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!unique.length) return new Map();
    const rows = await this.prisma.mediaAsset.findMany({ where: { id: { in: unique }, deletedAt: null } });
    return new Map(rows.map((m) => [m.id, toMediaRef(m)]));
  }

  async resolve(blocks: Block[], opts: { includeHidden?: boolean } = {}) {
    const visible = opts.includeHidden ? blocks : blocks.filter((b) => !b.hidden);
    const resolved: ResolvedBlock[] = [];
    for (const b of visible) resolved.push({ ...b, resolved: await this.resolveBlock(b) });
    const media = await this.mediaMap(visible.flatMap((b) => collectMediaIds(b)));
    return { blocks: resolved, media: Object.fromEntries(media) as Record<string, MediaRef> };
  }

  private async resolveBlock(b: Block): Promise<Record<string, unknown> | undefined> {
    switch (b.type) {
      case 'roomGrid': {
        const ids = collectRefIds(b, 'roomType');
        const rows = await this.prisma.roomType.findMany({
          where: { status: 'PUBLISHED', deletedAt: null, ...(ids.length ? { id: { in: ids } } : {}) },
          include: roomInclude,
          orderBy: { order: 'asc' },
        });
        const sorted = ids.length ? ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) : rows;
        return { roomTypes: sorted.map((r) => toRoomCard(r!)) };
      }
      case 'roomSpotlight': {
        const [id] = collectRefIds(b, 'roomType');
        if (!id) return undefined;
        const r = await this.prisma.roomType.findFirst({
          where: { id, status: 'PUBLISHED', deletedAt: null },
          include: { ...roomInclude, amenities: { include: { amenity: true }, orderBy: { order: 'asc' } } },
        });
        if (!r) return undefined;
        const media = await this.mediaMap(r.galleryIds.slice(0, 5));
        return { roomType: { ...toRoomCard(r), description: lr(r.description), gallery: pick(media, r.galleryIds.slice(0, 5)), amenities: r.amenities.slice(0, 8).map((a) => toAmenity(a.amenity)) } };
      }
      case 'facilities': {
        const ids = collectRefIds(b, 'facility');
        const rows = await this.prisma.facility.findMany({
          where: { status: { not: 'HIDDEN' }, deletedAt: null, ...(ids.length ? { id: { in: ids } } : {}) },
          orderBy: [{ order: 'asc' }],
        });
        const media = await this.mediaMap(rows.flatMap((f) => f.mediaIds));
        return { facilities: rows.map((f) => toFacility(f, media)) };
      }
      case 'progressTimeline': {
        const limit = typeof b.data.limit === 'number' ? b.data.limit : 3;
        const where = { status: 'PUBLISHED' as const, deletedAt: null };
        const [rows, total] = await Promise.all([
          this.prisma.progressUpdate.findMany({ where, orderBy: { happenedOn: 'desc' }, take: limit }),
          this.prisma.progressUpdate.count({ where }),
        ]);
        const media = await this.mediaMap(rows.flatMap((p) => p.mediaIds));
        const latest = rows.find((r) => r.percentComplete !== null);
        return { updates: rows.map((p) => toProgress(p, media)), total, percent: latest?.percentComplete ?? null, milestone: rows.find((r) => r.milestone)?.milestone ?? null };
      }
      case 'destinationCards': {
        const ids = collectRefIds(b, 'destination');
        const rows = await this.prisma.destination.findMany({
          where: { status: 'PUBLISHED', deletedAt: null, ...(ids.length ? { id: { in: ids } } : {}) },
          include: { hero: true },
          orderBy: { order: 'asc' },
        });
        const sorted = ids.length ? ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) : rows;
        return { destinations: sorted.map((d) => toDestinationCard(d!)) };
      }
      case 'faq': {
        const [id] = collectRefIds(b, 'faqGroup');
        if (!id) return undefined;
        const g = await this.prisma.faqGroup.findUnique({ where: { id }, include: { items: { orderBy: { order: 'asc' } } } });
        return g ? { group: toFaqGroup(g) } : undefined;
      }
      default:
        return undefined;
    }
  }
}
