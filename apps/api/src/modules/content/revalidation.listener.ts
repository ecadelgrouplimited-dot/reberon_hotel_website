import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { createHmac } from 'node:crypto';
import { CacheService } from '../../common/cache.service.js';
import { Events, type ContentChangedEvent } from '../../common/events.js';
import { env } from '../../config.js';

/**
 * Content changed → bust API cache for those tags, then ask the website to
 * revalidate. The website tags every content fetch with "content", so one call
 * refreshes everything that could show the change.
 */
@Injectable()
export class RevalidationListener {
  private readonly log = new Logger('Revalidate');

  constructor(private readonly cache: CacheService) {}

  /** Awaited by the request that changed content: the API cache is clean before the response goes out. */
  @OnEvent(Events.ContentChanged)
  async onContentChanged(e: ContentChangedEvent) {
    const tags = [...new Set([...e.tags, 'pages'])];
    await this.cache.bust(tags);
    void this.notifyWeb(tags); // network hop to the website: never block the editor on it
  }

  private async notifyWeb(tags: string[]) {
    const body = JSON.stringify({ tags: [...tags, 'content'], ts: Date.now() });
    const signature = createHmac('sha256', env.REVALIDATE_SECRET).update(body).digest('hex');
    try {
      const res = await fetch(`${env.WEB_URL}/api/revalidate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': signature },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) this.log.warn(`web revalidate responded ${res.status}`);
      else this.log.log(`revalidated: ${tags.join(', ')}`);
    } catch (err) {
      this.log.warn(`web revalidate failed (${(err as Error).message}); pages refresh on their next ISR window`);
    }
  }
}
