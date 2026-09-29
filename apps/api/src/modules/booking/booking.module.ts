import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InventoryService } from './inventory.service.js';
import { PricingService } from './pricing.service.js';
import { PaymentsService } from './payments.service.js';
import { BookingService } from './booking.service.js';
import { PublicBookingController, PaymentWebhookController, ReservationsAdminController, RatesAdminController, SellablesAdminController } from './booking.controllers.js';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicBookingController, PaymentWebhookController, ReservationsAdminController, RatesAdminController, SellablesAdminController],
  providers: [InventoryService, PricingService, PaymentsService, BookingService],
  exports: [BookingService, InventoryService, PricingService],
})
export class BookingModule {}
