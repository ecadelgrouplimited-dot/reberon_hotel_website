import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { zSendMessageInput, zTemplateInput, zTestMessageInput } from '@reberon/contracts';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { MessagingService } from './messaging.service.js';

@Controller('v1/admin')
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly integrations: IntegrationsService,
  ) {}

  /** Which channels really send, for the screens that offer them. */
  @Get('messaging/status')
  @Requires('messages:read')
  async status() {
    const [sms, wa] = await Promise.all([this.integrations.get('SMS_AFRICASTALKING'), this.integrations.get('WHATSAPP_CLOUD')]);
    return { EMAIL: true, SMS: !!sms, WHATSAPP: !!wa, otp: await this.messaging.otpRequired() };
  }

  @Get('message-templates')
  @Requires('settings:read')
  templates() {
    return this.messaging.templates();
  }

  @Put('message-templates/:id')
  @Requires('settings:write')
  update(@Param('id') id: string, @Body(new ZodPipe(zTemplateInput)) body: z.infer<typeof zTemplateInput>, @CurrentUser() user: AuthUser) {
    return this.messaging.updateTemplate(id, body, user);
  }

  @Post('message-templates/:id/reset')
  @HttpCode(200)
  @Requires('settings:write')
  reset(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messaging.resetTemplate(id, user);
  }

  @Post('message-templates/:id/test')
  @HttpCode(200)
  @Requires('settings:write')
  test(@Param('id') id: string, @Body(new ZodPipe(zTestMessageInput)) body: z.infer<typeof zTestMessageInput>, @CurrentUser() user: AuthUser) {
    return this.messaging.testTemplate(id, body.to, user);
  }

  @Get('messages')
  @Requires('messages:read')
  outbox(@Query() q: Record<string, string>) {
    return this.messaging.outbox({ status: q.status, channel: q.channel, reservationId: q.reservationId, take: 300 });
  }

  @Post('messages/:id/retry')
  @HttpCode(200)
  @Requires('bookings:write')
  retry(@Param('id') id: string) {
    return this.messaging.retry(id);
  }

  @Post('reservations/:id/messages')
  @HttpCode(200)
  @Requires('bookings:write')
  send(@Param('id') id: string, @Body(new ZodPipe(zSendMessageInput)) body: z.infer<typeof zSendMessageInput>, @CurrentUser() user: AuthUser) {
    return this.messaging.sendByStaff(id, body.templateKey, body.channel, user);
  }
}
