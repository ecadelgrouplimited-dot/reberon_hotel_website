import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AdminPageDTO, AdminPageSummaryDTO, Block, SeoDTO } from '@reberon/contracts';
import { zPageCreateInput, zPageUpdateInput, zBlocks, BLOCK_MAP } from '@reberon/contracts';
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../common/errors.js';
import type { z } from 'zod';
import type { Page, PageVersion, User } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { conflict, notFound, badRequest } from '../../common/errors.js';
import { Events } from '../../common/events.js';
import type { AuthUser } from '../../common/auth.js';
import { ResolverService } from './resolver.service.js';
import { lt, toSeo } from './mappers.js';
import { collectMediaIds } from '@reberon/contracts';

type PageRow = Page & { publishedVersion: PageVersion | null; updatedBy: Pick<User, 'name'> | null };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
    private readonly resolver: ResolverService,
  ) {}

  private summary(p: PageRow): AdminPageSummaryDTO {
    const pv = p.publishedVersion;
    return {
      id: p.id,
      slug: p.slug,
      kind: p.kind,
      title: lt(p.title),
      status: p.status,
      hasUnpublishedChanges: !pv || !same(pv.blocks, p.draftBlocks) || !same(pv.seo, p.draftSeo) || !same(pv.title, p.title),
      publishedAt: pv?.publishedAt.toISOString() ?? null,
      publishAt: p.publishAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      updatedBy: p.updatedBy?.name ?? null,
    };
  }

  private find(id: string) {
    return this.prisma.page.findFirst({ where: { id, deletedAt: null }, include: { publishedVersion: true, updatedBy: { select: { name: true } } } });
  }

  async list() {
    const rows = await this.prisma.page.findMany({
      where: { deletedAt: null },
      include: { publishedVersion: true, updatedBy: { select: { name: true } } },
      orderBy: [{ kind: 'asc' }, { slug: 'asc' }],
    });
    return rows.map((p) => this.summary(p));
  }

  async get(id: string): Promise<AdminPageDTO> {
    const p = await this.find(id);
    if (!p) throw notFound('Page');
    const blocks = p.draftBlocks as Block[];
    const seo = toSeo(p.draftSeo);
    const media = await this.resolver.mediaMap([...blocks.flatMap((b) => collectMediaIds(b)), ...(seo.shareImageId ? [seo.shareImageId] : [])]);
    return { ...this.summary(p), draftBlocks: blocks, draftSeo: seo, version: p.draftVersion, media: Object.fromEntries(media) };
  }

  async create(input: z.infer<typeof zPageCreateInput>, user: AuthUser, req: Request) {
    let blocks: Block[] = [];
    if (input.templateSlug !== undefined) {
      const tpl = await this.prisma.page.findFirst({ where: { slug: input.templateSlug, deletedAt: null } });
      if (!tpl) throw notFound('Template page');
      blocks = (tpl.draftBlocks as Block[]).map((b) => ({ ...b, id: `${b.type}-${randomUUID().slice(0, 8)}` }));
    }
    const page = await this.prisma.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: { slug: input.slug, kind: input.kind, title: input.title, draftBlocks: blocks as object[], updatedById: user.id },
      });
      await this.audit.record({ actor: user, action: 'page.create', entityType: 'Page', entityId: created.id, summary: `Created /${created.slug}`, after: { slug: created.slug, kind: created.kind }, req }, tx);
      return created;
    });
    return this.get(page.id);
  }

  async update(id: string, input: z.infer<typeof zPageUpdateInput>, expectedVersion: number | undefined, user: AuthUser, req: Request) {
    const p = await this.find(id);
    if (!p) throw notFound('Page');
    if (expectedVersion !== undefined && expectedVersion !== p.draftVersion) {
      throw conflict('Someone else saved this page since you opened it. Reload to see their changes.', 'CONFLICT_VERSION');
    }
    if (input.slug !== undefined && input.slug !== p.slug && ['HOME', 'SYSTEM'].includes(p.kind)) throw badRequest('This page’s address cannot change');
    await this.prisma.$transaction(async (tx) => {
      await tx.page.update({
        where: { id },
        data: {
          title: input.title ?? undefined,
          slug: input.slug ?? undefined,
          draftBlocks: (input.blocks as object[] | undefined) ?? undefined,
          draftSeo: (input.seo as object | undefined) ?? undefined,
          draftVersion: { increment: 1 },
          updatedById: user.id,
        },
      });
      if (input.slug !== undefined && input.slug !== p.slug && p.publishedVersionId) {
        await tx.redirect.upsert({
          where: { fromPath: `/${p.slug}` },
          create: { fromPath: `/${p.slug}`, toPath: `/${input.slug}`, statusCode: 301 },
          update: { toPath: `/${input.slug}` },
        });
      }
      await this.audit.record({ actor: user, action: 'page.update', entityType: 'Page', entityId: id, summary: `Edited draft of /${input.slug ?? p.slug}`, req }, tx);
    });
    if (input.slug !== undefined && input.slug !== p.slug) await this.events.emitAsync(Events.ContentChanged, { tags: [`page:${p.slug}`, `page:${input.slug}`, 'redirects', 'nav'] });
    return this.get(id);
  }

  async publishNow(id: string, userId: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.page.findUniqueOrThrow({ where: { id } });
      const last = await tx.pageVersion.findFirst({ where: { pageId: id }, orderBy: { version: 'desc' }, select: { version: true } });
      const v = await tx.pageVersion.create({
        data: { pageId: id, version: (last?.version ?? 0) + 1, title: p.title as object, blocks: p.draftBlocks as object[], seo: p.draftSeo as object, publishedById: userId },
      });
      await tx.page.update({ where: { id }, data: { publishedVersionId: v.id, status: 'PUBLISHED', publishAt: null } });
      return v;
    });
  }

  /** Strict check before anything goes live: names the block and field that need attention. */
  private validateForPublish(blocks: unknown) {
    const res = zBlocks.safeParse(blocks);
    if (res.success) return;
    const list = blocks as { type?: string }[];
    throw new AppError(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_FAILED',
      'Some blocks are incomplete. Fix them before publishing.',
      res.error.issues.map((i) => {
        const idx = Number(i.path[0]);
        const def = BLOCK_MAP[list[idx]?.type ?? ''];
        const field = def?.fields.find((f) => f.name === i.path[2]);
        const missing = /received undefined|expected record|too small|>=1 character/i.test(i.message);
        const message = field ? (missing ? `“${field.label}” is required` : `“${field.label}”: ${i.message}`) : i.message;
        return { path: i.path.join('.'), message: `${def?.label ?? 'Block'} (#${idx + 1}): ${message}` };
      }),
    );
  }

  async publish(id: string, publishAt: string | null | undefined, user: AuthUser, req: Request) {
    const p = await this.find(id);
    if (!p) throw notFound('Page');
    this.validateForPublish(p.draftBlocks);
    if (publishAt && new Date(publishAt) > new Date()) {
      await this.prisma.page.update({ where: { id }, data: { status: 'SCHEDULED', publishAt: new Date(publishAt) } });
      await this.audit.record({ actor: user, action: 'page.schedule', entityType: 'Page', entityId: id, summary: `Scheduled /${p.slug} for ${publishAt}`, req });
    } else {
      const v = await this.publishNow(id, user.id);
      await this.audit.record({ actor: user, action: 'page.publish', entityType: 'Page', entityId: id, summary: `Published /${p.slug} (v${v.version})`, req });
      await this.events.emitAsync(Events.ContentChanged, { tags: [`page:${p.slug}`] });
    }
    return this.get(id);
  }

  async unpublish(id: string, user: AuthUser, req: Request) {
    const p = await this.find(id);
    if (!p) throw notFound('Page');
    if (['HOME', 'SYSTEM'].includes(p.kind)) throw badRequest('The home page and system pages cannot be unpublished');
    await this.prisma.page.update({ where: { id }, data: { status: 'DRAFT', publishAt: null } });
    await this.audit.record({ actor: user, action: 'page.unpublish', entityType: 'Page', entityId: id, summary: `Unpublished /${p.slug}`, req });
    await this.events.emitAsync(Events.ContentChanged, { tags: [`page:${p.slug}`] });
    return this.get(id);
  }

  async versions(id: string) {
    const rows = await this.prisma.pageVersion.findMany({ where: { pageId: id }, orderBy: { version: 'desc' }, include: { publishedBy: { select: { name: true } } } });
    return rows.map((v) => ({ id: v.id, version: v.version, publishedAt: v.publishedAt.toISOString(), publishedBy: v.publishedBy?.name ?? 'System', blockCount: (v.blocks as unknown[]).length }));
  }

  async restore(id: string, version: number, user: AuthUser, req: Request) {
    const v = await this.prisma.pageVersion.findUnique({ where: { pageId_version: { pageId: id, version } } });
    if (!v) throw notFound('Version');
    await this.prisma.page.update({ where: { id }, data: { draftBlocks: v.blocks as object[], draftSeo: v.seo as object, title: v.title as object, draftVersion: { increment: 1 }, updatedById: user.id } });
    await this.audit.record({ actor: user, action: 'page.restore', entityType: 'Page', entityId: id, summary: `Restored v${version} into the draft`, req });
    return this.get(id);
  }

  async remove(id: string, user: AuthUser, req: Request) {
    const p = await this.find(id);
    if (!p) throw notFound('Page');
    if (['HOME', 'SYSTEM', 'LEGAL'].includes(p.kind)) throw badRequest('This page cannot be deleted');
    await this.prisma.page.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED', slug: `${p.slug}--deleted-${Date.now()}` } });
    await this.audit.record({ actor: user, action: 'page.delete', entityType: 'Page', entityId: id, summary: `Deleted /${p.slug}`, req });
    await this.events.emitAsync(Events.ContentChanged, { tags: [`page:${p.slug}`] });
  }
}

export type { SeoDTO };
