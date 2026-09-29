import { Body, Controller, Delete, Get, Headers, HttpCode, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { zPageCreateInput, zPageUpdateInput, zPublishInput } from '@reberon/contracts';
import type { z } from 'zod';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { PagesService } from './pages.service.js';
import { signPreviewToken } from './preview.js';

@Controller('v1/admin')
export class PagesAdminController {
  constructor(private readonly pages: PagesService) {}

  @Get('pages')
  @Requires('content:read')
  list() {
    return this.pages.list();
  }

  @Get('pages/:id')
  @Requires('content:read')
  get(@Param('id') id: string) {
    return this.pages.get(id);
  }

  @Post('pages')
  @Requires('content:write')
  create(@Body(new ZodPipe(zPageCreateInput)) body: z.infer<typeof zPageCreateInput>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pages.create(body, user, req);
  }

  @Patch('pages/:id')
  @Requires('content:write')
  update(
    @Param('id') id: string,
    @Body(new ZodPipe(zPageUpdateInput)) body: z.infer<typeof zPageUpdateInput>,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.pages.update(id, body, ifMatch ? Number(ifMatch) : undefined, user, req);
  }

  @Post('pages/:id/publish')
  @Requires('content:publish')
  publish(@Param('id') id: string, @Body(new ZodPipe(zPublishInput)) body: z.infer<typeof zPublishInput>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pages.publish(id, body.publishAt, user, req);
  }

  @Post('pages/:id/unpublish')
  @Requires('content:publish')
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pages.unpublish(id, user, req);
  }

  @Get('pages/:id/versions')
  @Requires('content:read')
  versions(@Param('id') id: string) {
    return this.pages.versions(id);
  }

  @Post('pages/:id/versions/:version/restore')
  @Requires('content:write')
  restore(@Param('id') id: string, @Param('version', ParseIntPipe) version: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pages.restore(id, version, user, req);
  }

  @Delete('pages/:id')
  @HttpCode(204)
  @Requires('content:write')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.pages.remove(id, user, req);
  }

  @Post('preview-token')
  @Requires('content:read')
  previewToken() {
    return { token: signPreviewToken() };
  }
}
