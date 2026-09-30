import { Controller, Get, HttpCode, Injectable, Logger, OnModuleDestroy, OnModuleInit, Post } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue, Worker } from 'bullmq';
import { createHmac } from 'node:crypto';
import { CacheService } from '../../common/cache.service.js';
import { RedisService } from '../../common/redis.service.js';
import { Requires } from '../../common/auth.js';
import { Events, type ContentChangedEvent } from '../../common/events.js';
import { env } from '../../config.js';

const QUEUE = 'revalidate';
const STATUS_KEY = 'web:revalidate:status';

export interface WebRefreshStatus {
  ok: boolean;
  at: string;
  error?: string;
  failingSince?: string;
}

/**
 * Content changed → bust the API cache (awaited, so the response is never
 * stale), then tell the website to revalidate through a retrying queue. The
 * last outcome is kept so the House can warn when the site is not refreshing.
 */
@Injectable()
export class RevalidationListener implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Revalidate');
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly cache: CacheService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    const connection = this.redis.bullConnection();
    this.queue = new Queue(QUEUE, { connection, defaultJobOptions: { attempts: 8, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 200 } });
    this.worker = new Worker(QUEUE, (job) => this.notifyWeb(job.data.tags as string[]), { connection, concurrency: 1 });
    this.worker.on('failed', (job, err) => this.log.warn(`website refresh attempt ${job?.attemptsMade} failed: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  @OnEvent(Events.ContentChanged)
  async onContentChanged(e: ContentChangedEvent) {
    const tags = [...new Set([...e.tags, 'pages'])];
    await this.cache.bust(tags);
    await this.queue.add('refresh', { tags }).catch((err) => this.log.error(`could not queue website refresh: ${err.message}`));
  }

  /** Throws on failure so BullMQ retries; records the outcome either way. */
  async notifyWeb(tags: string[]) {
    const body = JSON.stringify({ tags: [...tags, 'content'], ts: Date.now() });
    const signature = createHmac('sha256', env.REVALIDATE_SECRET).update(body).digest('hex');
    try {
      const res = await fetch(`${env.WEB_INTERNAL_URL ?? env.WEB_URL}/api/revalidate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': signature },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`website answered ${res.status}`);
      await this.setStatus({ ok: true, at: new Date().toISOString() });
      this.log.log(`website refreshed (${tags.join(', ')})`);
    } catch (err) {
      const prev = await this.status();
      const now = new Date().toISOString();
      await this.setStatus({ ok: false, at: now, error: (err as Error).message, failingSince: prev && !prev.ok ? (prev.failingSince ?? prev.at) : now });
      throw err;
    }
  }

  async status(): Promise<WebRefreshStatus | null> {
    const raw = await this.redis.client.get(STATUS_KEY);
    return raw ? (JSON.parse(raw) as WebRefreshStatus) : null;
  }

  private async setStatus(s: WebRefreshStatus) {
    await this.redis.client.set(STATUS_KEY, JSON.stringify(s));
  }

  /** Full refresh on demand: clear every API content cache entry, then refresh the site now. */
  async refreshEverything() {
    await this.cache.bust(['site', 'nav', 'pages', 'room-types', 'facilities', 'destinations', 'progress', 'faqs', 'media', 'redirects']);
    try {
      await this.notifyWeb(['content']);
    } catch {
      // status already recorded
    }
    return this.status();
  }
}

@Controller('v1/admin/site')
export class SiteStatusController {
  constructor(private readonly revalidation: RevalidationListener) {}

  @Get('status')
  @Requires('content:read')
  async status() {
    return { website: await this.revalidation.status() };
  }

  @Post('refresh')
  @HttpCode(200)
  @Requires('content:publish')
  async refresh() {
    return { website: await this.revalidation.refreshEverything() };
  }
}
