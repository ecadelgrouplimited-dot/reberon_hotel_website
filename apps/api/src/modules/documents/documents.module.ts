import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { DocumentsService } from './documents.service.js';
import { DocumentsAdminController, PublicDocumentsController } from './documents.controller.js';

/** Receipts, refund notes and invoices. */
@Module({
  imports: [NotificationsModule],
  controllers: [DocumentsAdminController, PublicDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
