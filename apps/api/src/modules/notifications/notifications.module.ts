import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsListener } from './notifications.listener.js';

@Module({
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
