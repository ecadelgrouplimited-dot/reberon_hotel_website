import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RedisService } from './redis.service.js';
import { CacheService } from './cache.service.js';
import { AuditService } from './audit.service.js';

@Global()
@Module({
  providers: [PrismaService, RedisService, CacheService, AuditService],
  exports: [PrismaService, RedisService, CacheService, AuditService],
})
export class CommonModule {}
