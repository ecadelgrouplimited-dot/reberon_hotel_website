import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { Events } from '../../common/events.js';
import { PagesService } from './pages.service.js';

/** Publishes pages whose scheduled time has arrived. */
@Injectable()
export class SchedulerService {
  private readonly log = new Logger('Scheduler');
  constructor(
    private readonly prisma: PrismaService,
    private readonly pages: PagesService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDue() {
    const due = await this.prisma.page.findMany({ where: { status: 'SCHEDULED', publishAt: { lte: new Date() }, deletedAt: null } });
    for (const p of due) {
      await this.pages.publishNow(p.id, null);
      await this.audit.record({ actorType: 'SYSTEM', action: 'page.publish', entityType: 'Page', entityId: p.id, summary: `Scheduled publish of /${p.slug}` });
      this.log.log(`published scheduled page /${p.slug}`);
    }
    if (due.length) this.events.emit(Events.ContentChanged, { tags: due.map((p) => `page:${p.slug}`) });
  }
}
