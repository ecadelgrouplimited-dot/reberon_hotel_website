-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('PESAPAL', 'SMS_AFRICASTALKING', 'WHATSAPP_CLOUD', 'SMTP');

-- CreateEnum
CREATE TYPE "IntegrationMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'NOT_CONNECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Integration" (
    "kind" "IntegrationKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "IntegrationMode" NOT NULL DEFAULT 'TEST',
    "config" JSONB NOT NULL DEFAULT '{}',
    "secretsEnc" TEXT,
    "secretHints" JSONB NOT NULL DEFAULT '{}',
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "heading" TEXT,
    "body" TEXT NOT NULL,
    "actionLabel" TEXT,
    "providerTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" UUID NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "to" TEXT NOT NULL,
    "templateKey" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "OutboundStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerRef" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "fallbackUrl" TEXT,
    "reservationId" UUID,
    "contactId" UUID,
    "sentById" UUID,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayOtp" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_channel_locale_key" ON "MessageTemplate"("key", "channel", "locale");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_reservationId_templateKey_idx" ON "OutboundMessage"("reservationId", "templateKey");

-- CreateIndex
CREATE INDEX "StayOtp_code_phone_idx" ON "StayOtp"("code", "phone");
