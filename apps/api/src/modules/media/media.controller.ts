import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import type { z } from 'zod';
import { zMediaPatch } from '@reberon/contracts';
import type { Prisma } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AppError, badRequest, notFound } from '../../common/errors.js';
import { Events } from '../../common/events.js';
import { MediaService } from './media.service.js';

@Controller('v1/admin/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  @Get()
  @Requires('media:read')
  async list(@Query() q: Record<string, string>) {
    const where: Prisma.MediaAssetWhereInput = { deletedAt: null };
    if (q.folder) where.folder = q.folder === '__none' ? null : q.folder;
    if (q.kind) where.kind = q.kind as 'IMAGE';
    if (q.rendering === 'true') where.isRendering = true;
    if (q.rendering === 'false') where.isRendering = false;
    if (q.tag) where.tags = { has: q.tag };
    if (q.q) where.OR = [{ originalName: { contains: q.q, mode: 'insensitive' } }, { alt: { path: ['en'], string_contains: q.q } }, { tags: { has: q.q.toLowerCase() } }];
    const skip = Number(q.cursor) || 0;
    const limit = Math.min(200, Number(q.limit) || 60);
    const [rows, total, folders] = await Promise.all([
      this.prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.groupBy({ by: ['folder'], where: { deletedAt: null }, _count: true, orderBy: { folder: 'asc' } }),
    ]);
    return {
      data: rows.map((m) => this.media.toDTO(m)),
      nextCursor: skip + limit < total ? String(skip + limit) : null,
      total,
      folders: folders.map((f) => ({ name: f.folder, count: f._count })),
    };
  }

  @Post()
  @Requires('media:upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: Record<string, string>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    if (!file) throw badRequest('Choose a file to upload');
    const dto = await this.media.upload(file, { folder: body.folder, alt: body.alt, isRendering: body.isRendering === 'true' }, user.id);
    await this.audit.record({ actor: user, action: 'media.upload', entityType: 'MediaAsset', entityId: dto.id, summary: `Uploaded ${dto.originalName}`, req });
    return dto;
  }

  @Get(':id')
  @Requires('media:read')
  async get(@Param('id') id: string) {
    const m = await this.prisma.mediaAsset.findFirst({ where: { id, deletedAt: null }, include: { uploadedBy: { select: { name: true } } } });
    if (!m) throw notFound('Media');
    const usages = await this.media.usages(id);
    return { ...this.media.toDTO(m, usages.length), uploadedBy: m.uploadedBy?.name ?? null, variants: m.variants, usages };
  }

  @Patch(':id')
  @Requires('media:manage')
  async update(@Param('id') id: string, @Body(new ZodPipe(zMediaPatch)) body: z.infer<typeof zMediaPatch>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const m = await this.prisma.mediaAsset.update({ where: { id }, data: { ...body, tags: body.tags?.map((t) => t.toLowerCase().trim()).filter(Boolean) } as Prisma.MediaAssetUpdateInput });
    await this.audit.record({ actor: user, action: 'media.update', entityType: 'MediaAsset', entityId: id, summary: `Updated ${m.originalName}`, after: body, req });
    this.events.emit(Events.ContentChanged, { tags: ['media'] });
    return this.media.toDTO(m);
  }

  @Delete(':id')
  @HttpCode(204)
  @Requires('media:manage')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const m = await this.prisma.mediaAsset.findFirst({ where: { id, deletedAt: null } });
    if (!m) throw notFound('Media');
    const usages = await this.media.usages(id);
    if (usages.length) {
      throw new AppError(409, 'IN_USE', `This is used in ${usages.length} place${usages.length > 1 ? 's' : ''}. Replace it there first.`, usages.map((u) => ({ path: u.type, message: u.label })));
    }
    await this.media.remove(m);
    await this.audit.record({ actor: user, action: 'media.delete', entityType: 'MediaAsset', entityId: id, summary: `Deleted ${m.originalName}`, req });
  }
}
