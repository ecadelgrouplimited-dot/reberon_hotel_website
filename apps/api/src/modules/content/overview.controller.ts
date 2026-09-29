import { Controller, Get } from '@nestjs/common';
import type { Block } from '@reberon/contracts';
import { PrismaService } from '../../common/prisma.service.js';
import { Requires } from '../../common/auth.js';
import { lt } from './mappers.js';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * "What is live, what is draft, what still needs doing before launch" — one
 * read that powers the Publishing page in the House.
 */
@Controller('v1/admin/site')
export class SiteOverviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  @Requires('content:read')
  async overview() {
    const [pages, rooms, facilities, destinations, progress, settings, media, seedCounts] = await Promise.all([
      this.prisma.page.findMany({ where: { deletedAt: null }, include: { publishedVersion: true, updatedBy: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.roomType.findMany({ where: { deletedAt: null }, select: { id: true, name: true, status: true, heroMediaId: true, galleryIds: true, floorPlanMediaId: true, fromPriceUgx: true, updatedAt: true } }),
      this.prisma.facility.findMany({ where: { deletedAt: null }, select: { id: true, name: true, status: true, mediaIds: true } }),
      this.prisma.destination.findMany({ where: { deletedAt: null }, select: { id: true, name: true, status: true, heroMediaId: true, galleryIds: true, blocks: true } }),
      this.prisma.progressUpdate.findMany({ where: { deletedAt: null }, select: { id: true, title: true, status: true, mediaIds: true, happenedOn: true }, orderBy: { happenedOn: 'desc' } }),
      this.prisma.setting.findMany(),
      this.prisma.mediaAsset.findMany({ where: { deletedAt: null }, select: { id: true, isRendering: true, alt: true, status: true, kind: true } }),
      Promise.all([
        this.prisma.roomType.count({ where: { isSeed: true, deletedAt: null } }),
        this.prisma.conversation.count({ where: { isSeed: true } }),
        this.prisma.waitlistEntry.count({ where: { isSeed: true } }),
        this.prisma.user.count({ where: { isSeed: true, status: 'ACTIVE' } }),
      ]),
    ]);

    // Every image the public website can show right now.
    const live = new Set<string>();
    const add = (ids: (string | null | undefined)[]) => ids.forEach((i) => i && live.add(i));
    rooms.filter((r) => r.status === 'PUBLISHED').forEach((r) => add([r.heroMediaId, r.floorPlanMediaId, ...r.galleryIds]));
    facilities.filter((f) => f.status !== 'HIDDEN').forEach((f) => add(f.mediaIds));
    destinations.filter((d) => d.status === 'PUBLISHED').forEach((d) => add([d.heroMediaId, ...d.galleryIds, ...(JSON.stringify(d.blocks).match(UUID) ?? [])]));
    progress.filter((p) => p.status === 'PUBLISHED').forEach((p) => add(p.mediaIds));
    pages.filter((p) => p.status === 'PUBLISHED' && p.publishedVersion).forEach((p) => {
      const visible = (p.publishedVersion!.blocks as Block[]).filter((b) => !b.hidden);
      add(JSON.stringify([visible, p.publishedVersion!.seo]).match(UUID) ?? []);
    });
    settings.forEach((s) => add(JSON.stringify(s.value).match(UUID) ?? []));
    const liveMedia = media.filter((m) => live.has(m.id));

    const s = Object.fromEntries(settings.map((x) => [x.key, x.value]));
    const phones = (s['contact.phones'] as string[] | undefined) ?? [];
    const checks = [
      { key: 'phones', ok: phones.length > 0 && !phones.some((p) => /700\s?000\s?000/.test(p)), label: 'Real phone number', detail: phones.join(', ') || 'None set', href: '/settings' },
      { key: 'whatsapp', ok: !!s['contact.whatsapp'] && !/700000000$/.test(String(s['contact.whatsapp'])), label: 'Real WhatsApp number', detail: String(s['contact.whatsapp'] ?? 'None set'), href: '/settings' },
      { key: 'logo', ok: !!s['hotel.logoId'], label: 'Logo uploaded', detail: s['hotel.logoId'] ? 'Set' : 'Using the Reberon wordmark (fine to launch with)', href: '/settings', optional: true },
      { key: 'photos', ok: liveMedia.filter((m) => m.isRendering).length === 0, label: 'Real photographs on the website', detail: `${liveMedia.filter((m) => m.isRendering).length} of ${liveMedia.length} images on the site are still drawings or placeholders`, href: '/media?rendering=true' },
      { key: 'alt', ok: liveMedia.every((m) => !!lt(m.alt).en), label: 'Every image has alt text', detail: `${liveMedia.filter((m) => !lt(m.alt).en).length} images on the site need a description`, href: '/media' },
      { key: 'prices', ok: rooms.filter((r) => r.status === 'PUBLISHED').every((r) => r.fromPriceUgx !== null), label: 'From-prices on every room', detail: 'Starting figures in UGX', href: '/website/rooms' },
      { key: 'demo', ok: seedCounts[1] + seedCounts[2] === 0, label: 'Demo enquiries and waitlist removed', detail: `${seedCounts[1]} demo conversations, ${seedCounts[2]} demo waitlist names — run “pnpm db:purge-demo” before launch`, optional: false },
      { key: 'seedUsers', ok: seedCounts[3] <= 1, label: 'Demo staff accounts disabled', detail: `${seedCounts[3]} demo accounts active`, href: '/settings/users' },
    ];

    return {
      pages: pages.map((p) => {
        const draft = p.draftBlocks as Block[];
        const pub = (p.publishedVersion?.blocks as Block[] | undefined) ?? [];
        const pubById = new Map(pub.map((b) => [b.id, b]));
        const changed = draft.filter((b) => !same(pubById.get(b.id), b)).length + pub.filter((b) => !draft.some((d) => d.id === b.id)).length;
        return {
          id: p.id,
          slug: p.slug,
          kind: p.kind,
          title: lt(p.title),
          status: p.status,
          publishAt: p.publishAt,
          unpublished: !p.publishedVersion || !same(pub, draft) || !same(p.publishedVersion.seo, p.draftSeo) || !same(p.publishedVersion.title, p.title),
          changedBlocks: p.publishedVersion ? changed : draft.length,
          hiddenBlocks: draft.filter((b) => b.hidden).length,
          updatedAt: p.updatedAt,
          updatedBy: p.updatedBy?.name ?? null,
        };
      }),
      notLive: [
        ...rooms.filter((r) => r.status !== 'PUBLISHED').map((r) => ({ type: 'Room type', id: r.id, title: lt(r.name), status: r.status, href: `/website/rooms/${r.id}` })),
        ...destinations.filter((d) => d.status !== 'PUBLISHED').map((d) => ({ type: 'Kapchorwa story', id: d.id, title: lt(d.name), status: d.status, href: `/website/destinations/${d.id}` })),
        ...facilities.filter((f) => f.status === 'HIDDEN').map((f) => ({ type: 'Facility', id: f.id, title: lt(f.name), status: f.status, href: `/website/facilities/${f.id}` })),
        ...progress.filter((p) => p.status !== 'PUBLISHED').map((p) => ({ type: 'Progress update', id: p.id, title: lt(p.title), status: p.status, href: `/website/rising/${p.id}` })),
      ],
      media: { onSite: liveMedia.length, drawingsOnSite: liveMedia.filter((m) => m.isRendering).length, missingAlt: liveMedia.filter((m) => !lt(m.alt).en).length, failed: media.filter((m) => m.status === 'FAILED').length },
      checks,
    };
  }
}
