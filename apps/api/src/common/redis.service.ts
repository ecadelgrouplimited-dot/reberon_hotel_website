import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { env } from '../config.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });

  /** Options for BullMQ queues/workers (they need their own connections). */
  bullConnection() {
    return { url: env.REDIS_URL, maxRetriesPerRequest: null };
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
