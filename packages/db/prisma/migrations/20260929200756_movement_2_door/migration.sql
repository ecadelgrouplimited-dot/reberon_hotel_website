-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('UGX', 'USD');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('RO', 'BB', 'HB', 'FB');

-- CreateEnum
CREATE TYPE "ExtraKind" AS ENUM ('TRANSFER', 'GUIDE', 'MEAL', 'BED', 'LATE_CHECKOUT', 'EXPERIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtraUnit" AS ENUM ('PER_STAY', 'PER_NIGHT', 'PER_PERSON', 'PER_TRIP');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('DIRECT', 'WHATSAPP', 'WALK_IN', 'PHONE', 'PORTAL');

-- CreateEnum
CREATE TYPE "FolioLineKind" AS ENUM ('ROOM', 'EXTRA', 'PACKAGE', 'TAX', 'FNB', 'ADJUSTMENT', 'PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('DEPOSIT', 'FULL', 'BALANCE', 'EXTRA');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY', 'CARD', 'CASH', 'BANK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PESAPAL', 'TEST', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GuestRequestKind" AS ENUM ('EXTRA', 'LATE_CHECKOUT', 'GUIDE', 'TRANSFER', 'ADD_NIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "GuestRequestStatus" AS ENUM ('NEW', 'ACCEPTED', 'DECLINED', 'DONE');

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "text" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" UUID NOT NULL,
    "name" JSONB NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "inclusive" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'BB',
    "minNights" SMALLINT NOT NULL DEFAULT 1,
    "depositPercent" SMALLINT NOT NULL DEFAULT 30,
    "cancellationPolicyId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" UUID NOT NULL,
    "ratePlanId" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDay" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "totalRooms" SMALLINT NOT NULL,
    "soldRooms" SMALLINT NOT NULL DEFAULT 0,
    "heldRooms" SMALLINT NOT NULL DEFAULT 0,
    "blockedRooms" SMALLINT NOT NULL DEFAULT 0,
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "minStay" SMALLINT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "body" JSONB,
    "nights" SMALLINT NOT NULL DEFAULT 1,
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "heroMediaId" UUID,
    "galleryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceUgx" BIGINT,
    "priceUsd" BIGINT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extra" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "kind" "ExtraKind" NOT NULL,
    "unit" "ExtraUnit" NOT NULL DEFAULT 'PER_STAY',
    "priceUgx" BIGINT NOT NULL,
    "priceUsd" BIGINT,
    "mediaId" UUID,
    "isExperience" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "source" "ReservationSource" NOT NULL DEFAULT 'DIRECT',
    "contactId" UUID NOT NULL,
    "ratePlanId" UUID NOT NULL,
    "packageId" UUID,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" SMALLINT NOT NULL,
    "children" SMALLINT NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "depositMinor" BIGINT NOT NULL DEFAULT 0,
    "cancellationSnapshot" JSONB NOT NULL,
    "eta" TEXT,
    "guestNotes" TEXT,
    "staffNotes" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationRoom" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "roomId" UUID,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "nightly" JSONB NOT NULL,

    CONSTRAINT "ReservationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationExtra" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "extraId" UUID NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "unitMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ReservationExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationChange" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folio" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioLine" (
    "id" UUID NOT NULL,
    "folioId" UUID NOT NULL,
    "kind" "FolioLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountMinor" BIGINT NOT NULL,
    "paymentId" UUID,
    "reversesLineId" UUID,
    "postedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'UNKNOWN',
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "merchantReference" TEXT NOT NULL,
    "providerTrackingId" TEXT,
    "providerStatus" TEXT,
    "confirmationCode" TEXT,
    "redirectUrl" TEXT,
    "recordedById" UUID,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "paymentIntentId" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRequest" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "kind" "GuestRequestKind" NOT NULL,
    "extraId" UUID,
    "note" TEXT,
    "status" "GuestRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RatePlan_code_key" ON "RatePlan"("code");

-- CreateIndex
CREATE INDEX "Rate_roomTypeId_date_idx" ON "Rate"("roomTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_ratePlanId_roomTypeId_date_currency_key" ON "Rate"("ratePlanId", "roomTypeId", "date", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDay_roomTypeId_date_key" ON "InventoryDay"("roomTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Extra_slug_key" ON "Extra"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_status_arrival_idx" ON "Reservation"("status", "arrival");

-- CreateIndex
CREATE INDEX "Reservation_arrival_departure_idx" ON "Reservation"("arrival", "departure");

-- CreateIndex
CREATE UNIQUE INDEX "Folio_reservationId_key" ON "Folio"("reservationId");

-- CreateIndex
CREATE INDEX "FolioLine_folioId_createdAt_idx" ON "FolioLine"("folioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_merchantReference_key" ON "PaymentIntent"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_providerTrackingId_key" ON "PaymentIntent"("providerTrackingId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_createdAt_idx" ON "PaymentIntent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "CancellationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationRoom" ADD CONSTRAINT "ReservationRoom_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationExtra" ADD CONSTRAINT "ReservationExtra_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationChange" ADD CONSTRAINT "ReservationChange_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioLine" ADD CONSTRAINT "FolioLine_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Invariants enforced by the database, not only the application ──
ALTER TABLE "InventoryDay" ADD CONSTRAINT "inventory_never_oversold"
  CHECK ("soldRooms" >= 0 AND "heldRooms" >= 0 AND "blockedRooms" >= 0 AND "soldRooms" + "heldRooms" + "blockedRooms" <= "totalRooms");
ALTER TABLE "Reservation" ADD CONSTRAINT "reservation_dates_ordered" CHECK ("arrival" < "departure");
ALTER TABLE "Reservation" ADD CONSTRAINT "reservation_guests_positive" CHECK ("adults" >= 1 AND "children" >= 0);
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "payment_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Rate" ADD CONSTRAINT "rate_amount_positive" CHECK ("amountMinor" > 0);

-- The folio is a ledger: lines are never edited or deleted, only reversed.
CREATE OR REPLACE FUNCTION folio_line_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'FolioLine is append-only; post a reversing line instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER folio_line_no_update BEFORE UPDATE ON "FolioLine" FOR EACH ROW EXECUTE FUNCTION folio_line_append_only();
CREATE TRIGGER folio_line_no_delete BEFORE DELETE ON "FolioLine" FOR EACH ROW WHEN (pg_trigger_depth() = 0 AND current_setting('reberon.allow_folio_purge', true) IS DISTINCT FROM 'on') EXECUTE FUNCTION folio_line_append_only();
