import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../common/redis.service.js';

@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async health() {
    const [db, cache] = await Promise.allSettled([this.prisma.$queryRaw`SELECT 1`, this.redis.client.ping()]);
    return { status: db.status === 'fulfilled' && cache.status === 'fulfilled' ? 'ok' : 'degraded', db: db.status === 'fulfilled', redis: cache.status === 'fulfilled', time: new Date().toISOString() };
  }
}
