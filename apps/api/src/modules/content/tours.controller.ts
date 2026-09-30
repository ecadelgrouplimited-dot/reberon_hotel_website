import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { zTourEventInput, zTourInput } from '@reberon/contracts';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { ToursService } from './tours.service.js';

@Controller('v1/public/tours')
export class PublicToursController {
  constructor(private readonly tours: ToursService) {}

  @Get()
  showing() {
    return this.tours.showing();
  }

  /** Anonymous analytics: a random session id, never a person. */
  @Post(':id/events')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  event(@Param('id') id: string, @Body(new ZodPipe(zTourEventInput)) body: z.infer<typeof zTourEventInput>) {
    return this.tours.recordEvent(id, body);
  }
}

@Controller('v1/admin/tours')
export class ToursAdminController {
  constructor(private readonly tours: ToursService) {}

  @Get()
  @Requires('content:read')
  list(@Query('days') days?: string) {
    return this.tours.list(Math.min(365, Math.max(7, Number(days) || 90)));
  }

  @Get(':id')
  @Requires('content:read')
  get(@Param('id') id: string) {
    return this.tours.get(id);
  }

  @Post()
  @Requires('content:write')
  create(@Body(new ZodPipe(zTourInput)) body: z.infer<typeof zTourInput>, @CurrentUser() user: AuthUser) {
    return this.tours.create(body, user);
  }

  @Patch(':id')
  @Requires('content:write')
  update(@Param('id') id: string, @Body(new ZodPipe(zTourInput)) body: z.infer<typeof zTourInput>, @CurrentUser() user: AuthUser) {
    return this.tours.update(id, body, user);
  }

  @Delete(':id')
  @Requires('content:write')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tours.remove(id, user);
  }
}
