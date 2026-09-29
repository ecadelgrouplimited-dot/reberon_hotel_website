import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue, Worker } from 'bullmq';
import sharp from 'sharp';
import { createStorage, mediaKeys, processImage, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } from '@reberon/media';
import type { AdminMediaDTO } from '@reberon/contracts';
import type { MediaAsset, Prisma } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { badRequest } from '../../common/errors.js';
import { Events } from '../../common/events.js';
import { toMediaRef } from '../content/mappers.js';

const QUEUE = 'media';

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Media');
  readonly storage = createStorage();
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit() {
    const connection = this.redis.bullConnection();
    this.queue = new Queue(QUEUE, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 200 } });
    this.worker = new Worker(QUEUE, (job) => this.process(job.data.id as string), { connection, concurrency: 2 });
    this.worker.on('failed', async (job, err) => {
      this.log.warn(`processing ${job?.data?.id} failed: ${err.message}`);
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) await this.prisma.mediaAsset.update({ where: { id: job.data.id }, data: { status: 'FAILED' } }).catch(() => undefined);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  toDTO(m: MediaAsset, usageCount?: number): AdminMediaDTO {
    return { ...toMediaRef(m), originalName: m.originalName, mimeType: m.mimeType, bytes: m.bytes, status: m.status, tags: m.tags, folder: m.folder, createdAt: m.createdAt.toISOString(), usageCount };
  }

  async upload(file: Express.Multer.File, meta: { folder?: string; alt?: string; isRendering?: boolean }, userId: string) {
    // Trust the bytes, not the browser's declared type.
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isDoc = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) && file.buffer.subarray(0, 5).toString() === '%PDF-';
    if (!isImage && !isDoc) throw badRequest('Upload photos (JPEG, PNG, WebP, HEIC) or PDF documents only.');
    if (isImage) {
      try {
        await sharp(file.buffer).metadata();
      } catch {
        throw badRequest('That file is not a readable image.');
      }
    }
    const ext = (file.originalname.split('.').pop() ?? (isDoc ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const asset = await this.prisma.mediaAsset.create({
      data: {
        kind: isImage ? 'IMAGE' : 'DOCUMENT',
        status: isImage ? 'PROCESSING' : 'READY',
        storageKey: 'pending',
        originalName: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
        bytes: file.size,
        alt: meta.alt ? { en: meta.alt } : {},
        folder: meta.folder || null,
        isRendering: meta.isRendering ?? false,
        uploadedById: userId,
      },
    });
    const key = mediaKeys.original(asset.id, ext);
    await this.storage.put(key, file.buffer, file.mimetype);
    if (isDoc) await this.storage.put(mediaKeys.file(asset.id, file.originalname.replace(/[^\w.-]/g, '_')), file.buffer, file.mimetype);
    const updated = await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { storageKey: key, originalName: isDoc ? file.originalname.replace(/[^\w.-]/g, '_') : asset.originalName } });
    if (isImage) await this.queue.add('process', { id: asset.id });
    return this.toDTO(updated);
  }

  async process(id: string) {
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
    const original = await this.storage.get(asset.storageKey);
    const p = await processImage(id, original, this.storage);
    await this.prisma.mediaAsset.update({
      where: { id },
      data: { status: 'READY', width: p.width, height: p.height, lqip: p.lqip, dominantColor: p.dominantColor, variants: p.variants as unknown as Prisma.InputJsonValue },
    });
    this.log.log(`processed ${asset.originalName} (${p.width}×${p.height})`);
    await this.events.emitAsync(Events.ContentChanged, { tags: ['media'] });
  }

  /** Every place a media asset is referenced, so nobody deletes a photo the site still shows. */
  async usages(id: string) {
    const like = `%${id}%`;
    const [rooms, facilities, dests, progress, pages, settings] = await Promise.all([
      this.prisma.roomType.findMany({ where: { deletedAt: null, OR: [{ heroMediaId: id }, { floorPlanMediaId: id }, { galleryIds: { has: id } }] }, select: { id: true, name: true } }),
      this.prisma.facility.findMany({ where: { deletedAt: null, mediaIds: { has: id } }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ id: string; name: unknown }[]>`SELECT id, name FROM "Destination" WHERE "deletedAt" IS NULL AND ("heroMediaId" = ${id}::uuid OR ${id} = ANY("galleryIds") OR blocks::text LIKE ${like})`,
      this.prisma.progressUpdate.findMany({ where: { deletedAt: null, mediaIds: { has: id } }, select: { id: true, title: true } }),
      this.prisma.$queryRaw<{ id: string; title: unknown; slug: string }[]>`
        SELECT DISTINCT p.id, p.title, p.slug FROM "Page" p LEFT JOIN "PageVersion" v ON v.id = p."publishedVersionId"
        WHERE p."deletedAt" IS NULL AND (p."draftBlocks"::text LIKE ${like} OR p."draftSeo"::text LIKE ${like} OR v.blocks::text LIKE ${like})`,
      this.prisma.$queryRaw<{ key: string }[]>`SELECT key FROM "Setting" WHERE value::text LIKE ${like}`,
    ]);
    const label = (v: unknown) => (v && typeof v === 'object' ? ((v as Record<string, string>).en ?? '') : '');
    return [
      ...rooms.map((r) => ({ type: 'Room type', id: r.id, label: label(r.name), href: `/website/rooms/${r.id}` })),
      ...facilities.map((r) => ({ type: 'Facility', id: r.id, label: label(r.name), href: `/website/facilities/${r.id}` })),
      ...dests.map((r) => ({ type: 'Destination', id: r.id, label: label(r.name), href: `/website/destinations/${r.id}` })),
      ...progress.map((r) => ({ type: 'Progress update', id: r.id, label: label(r.title), href: `/website/rising/${r.id}` })),
      ...pages.map((r) => ({ type: 'Page', id: r.id, label: `${label(r.title)} (/${r.slug})`, href: `/website/pages/${r.id}` })),
      ...settings.map((s) => ({ type: 'Setting', id: s.key, label: s.key, href: '/settings' })),
    ];
  }

  async remove(asset: MediaAsset) {
    await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
    await this.storage.remove(`public/i/${asset.id}`);
    await this.storage.remove(`public/f/${asset.id}`);
  }
}
