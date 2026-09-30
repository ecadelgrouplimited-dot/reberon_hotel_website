-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('RECEIPT', 'REFUND', 'INVOICE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "canSignIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "grants" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "revokes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "signInFrom" TEXT,
ADD COLUMN     "signInUntil" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "IssuedDocument" (
    "id" UUID NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "number" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "seq" INTEGER NOT NULL,
    "reservationId" UUID,
    "paymentIntentId" UUID,
    "folioLineId" UUID,
    "currency" "Currency" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "issuedTo" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,
    "replacesId" UUID,
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "isSeed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IssuedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "series" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("series")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuedDocument_number_key" ON "IssuedDocument"("number");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedDocument_paymentIntentId_key" ON "IssuedDocument"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedDocument_folioLineId_key" ON "IssuedDocument"("folioLineId");

-- CreateIndex
CREATE INDEX "IssuedDocument_reservationId_idx" ON "IssuedDocument"("reservationId");

-- CreateIndex
CREATE INDEX "IssuedDocument_kind_issuedAt_idx" ON "IssuedDocument"("kind", "issuedAt");
