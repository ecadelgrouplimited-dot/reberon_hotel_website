import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsListener } from './notifications.listener.js';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';

@Module({
  controllers: [MessagingController],
  providers: [NotificationsService, NotificationsListener, MessagingService],
  exports: [NotificationsService, MessagingService],
})
export class NotificationsModule {}
