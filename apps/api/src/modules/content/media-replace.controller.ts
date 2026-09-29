import { Body, Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { badRequest, notFound } from '../../common/errors.js';
import { Events } from '../../common/events.js';
import { PagesService } from './pages.service.js';

const zReplace = z.object({ withId: z.string().uuid() });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Swap one image for another everywhere it is used — the way placeholder
 * drawings become real photographs. Pages whose draft matched the live
 * version are re-published so the new photo shows at once; pages with
 * unpublished work only get the swap in their draft.
 */
@Controller('v1/admin/media')
export class MediaReplaceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pages: PagesService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  @Post(':id/replace')
  @HttpCode(200)
  @Requires('content:write', 'media:manage')
  async replace(@Param('id') oldId: string, @Body(new ZodPipe(zReplace)) body: z.infer<typeof zReplace>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const newId = body.withId;
    if (oldId === newId) throw badRequest('Choose a different image');
    const [from, to] = await Promise.all([
      this.prisma.mediaAsset.findFirst({ where: { id: oldId, deletedAt: null } }),
      this.prisma.mediaAsset.findFirst({ where: { id: newId, deletedAt: null } }),
    ]);
    if (!from || !to) throw notFound('Image');
    if (to.kind !== 'IMAGE' || to.status !== 'READY') throw badRequest('The new image is still being processed. Try again in a moment.');

    const livePages = await this.prisma.page.findMany({ where: { deletedAt: null }, include: { publishedVersion: true } });
    const inSync = new Set(livePages.filter((p) => p.publishedVersion && p.status === 'PUBLISHED' && same(p.publishedVersion.blocks, p.draftBlocks) && same(p.publishedVersion.seo, p.draftSeo)).map((p) => p.id));
    const like = `%${oldId}%`;

    const counts = await this.prisma.$transaction(async (tx) => {
      const n = (x: number | bigint) => Number(x);
      const c = {
        rooms: n(await tx.$executeRaw`UPDATE "RoomType" SET "heroMediaId" = CASE WHEN "heroMediaId" = ${oldId}::uuid THEN ${newId}::uuid ELSE "heroMediaId" END,
            "floorPlanMediaId" = CASE WHEN "floorPlanMediaId" = ${oldId}::uuid THEN ${newId}::uuid ELSE "floorPlanMediaId" END,
            "galleryIds" = array_replace("galleryIds", ${oldId}, ${newId}), "updatedAt" = now()
          WHERE "heroMediaId" = ${oldId}::uuid OR "floorPlanMediaId" = ${oldId}::uuid OR ${oldId} = ANY("galleryIds")`),
        facilities: n(await tx.$executeRaw`UPDATE "Facility" SET "mediaIds" = array_replace("mediaIds", ${oldId}, ${newId}), "updatedAt" = now() WHERE ${oldId} = ANY("mediaIds")`),
        progress: n(await tx.$executeRaw`UPDATE "ProgressUpdate" SET "mediaIds" = array_replace("mediaIds", ${oldId}, ${newId}), "updatedAt" = now() WHERE ${oldId} = ANY("mediaIds")`),
        destinations: n(await tx.$executeRaw`UPDATE "Destination" SET "heroMediaId" = CASE WHEN "heroMediaId" = ${oldId}::uuid THEN ${newId}::uuid ELSE "heroMediaId" END,
            "galleryIds" = array_replace("galleryIds", ${oldId}, ${newId}),
            blocks = replace(blocks::text, ${oldId}, ${newId})::jsonb, "updatedAt" = now()
          WHERE "heroMediaId" = ${oldId}::uuid OR ${oldId} = ANY("galleryIds") OR blocks::text LIKE ${like}`),
        pages: n(await tx.$executeRaw`UPDATE "Page" SET "draftBlocks" = replace("draftBlocks"::text, ${oldId}, ${newId})::jsonb,
            "draftSeo" = replace("draftSeo"::text, ${oldId}, ${newId})::jsonb, "draftVersion" = "draftVersion" + 1, "updatedAt" = now()
          WHERE "deletedAt" IS NULL AND ("draftBlocks"::text LIKE ${like} OR "draftSeo"::text LIKE ${like})`),
        settings: n(await tx.$executeRaw`UPDATE "Setting" SET value = replace(value::text, ${oldId}, ${newId})::jsonb WHERE value::text LIKE ${like}`),
      };
      await this.audit.record({ actor: user, action: 'media.replace', entityType: 'MediaAsset', entityId: oldId, summary: `Replaced ${from.originalName} with ${to.originalName} everywhere`, after: { withId: newId, ...c }, req }, tx);
      return c;
    });

    // Re-publish pages that were live-and-in-sync, so the new photo is live too.
    const touched = await this.prisma.page.findMany({ where: { id: { in: [...inSync] } }, select: { id: true, slug: true, draftBlocks: true, draftSeo: true, publishedVersion: true } });
    const republished: string[] = [];
    for (const p of touched) {
      if (!same(p.publishedVersion?.blocks, p.draftBlocks) || !same(p.publishedVersion?.seo, p.draftSeo)) {
        await this.pages.publishNow(p.id, user.id);
        republished.push(p.slug);
      }
    }
    const draftOnly = counts.pages - republished.length;

    await this.events.emitAsync(Events.ContentChanged, { tags: ['site', 'room-types', 'facilities', 'progress', 'destinations', 'media', ...republished.map((s) => `page:${s}`)] });
    return { ...counts, republished, draftOnly };
  }
}
