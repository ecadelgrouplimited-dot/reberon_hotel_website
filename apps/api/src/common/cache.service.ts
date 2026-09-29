import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * JSON cache for public responses with tag invalidation.
 * A key is registered under each of its tags; busting a tag deletes every key under it.
 */
@Injectable()
export class CacheService {
  private readonly log = new Logger('Cache');
  constructor(private readonly redis: RedisService) {}

  async wrap<T>(key: string, tags: string[], ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const k = `cache:public:${key}`;
    try {
      const hit = await this.redis.client.get(k);
      if (hit) return JSON.parse(hit) as T;
    } catch (e) {
      this.log.warn(`cache read failed: ${(e as Error).message}`);
    }
    const value = await fn();
    try {
      const multi = this.redis.client.multi().set(k, JSON.stringify(value), 'EX', ttlSeconds);
      for (const t of tags) multi.sadd(`cache:tag:${t}`, k).expire(`cache:tag:${t}`, ttlSeconds * 2);
      await multi.exec();
    } catch (e) {
      this.log.warn(`cache write failed: ${(e as Error).message}`);
    }
    return value;
  }

  async bust(tags: string[]) {
    for (const t of tags) {
      const keys = await this.redis.client.smembers(`cache:tag:${t}`);
      if (keys.length) await this.redis.client.del(...keys);
      await this.redis.client.del(`cache:tag:${t}`);
    }
  }
}
