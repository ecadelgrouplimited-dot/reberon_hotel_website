-- CreateEnum
CREATE TYPE "TourSpace" AS ENUM ('LOBBY', 'ROOM_TYPE', 'HALL', 'COMPOUND', 'BEYOND');

-- CreateEnum
CREATE TYPE "TourProvider" AS ENUM ('MATTERPORT', 'KUULA', 'VIDEO', 'CUSTOM_URL', 'DRAWINGS');

-- CreateEnum
CREATE TYPE "TourStage" AS ENUM ('PRE_OPENING', 'LIVE');

-- CreateEnum
CREATE TYPE "TourVariant" AS ENUM ('EMPTY', 'SET');

-- CreateEnum
CREATE TYPE "HotspotKind" AS ENUM ('BED', 'BATH', 'VIEW', 'CAPACITY', 'ACCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "TourEventKind" AS ENUM ('OPENED', 'COMPLETED', 'HOTSPOT', 'CTA_CLICK');

-- CreateEnum
CREATE TYPE "TourContext" AS ENUM ('ROOM_PAGE', 'CHECKOUT', 'PAGE');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "tourSessionId" TEXT;

-- CreateTable
CREATE TABLE "Tour" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "space" "TourSpace" NOT NULL,
    "roomTypeId" UUID,
    "variant" "TourVariant",
    "provider" "TourProvider" NOT NULL,
    "embedUrl" TEXT,
    "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posterId" UUID,
    "stage" "TourStage" NOT NULL DEFAULT 'PRE_OPENING',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourHotspot" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "kind" "HotspotKind" NOT NULL,
    "label" JSONB NOT NULL,
    "note" JSONB NOT NULL DEFAULT '{}',
    "providerRef" TEXT,
    "frame" SMALLINT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourEvent" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "event" "TourEventKind" NOT NULL,
    "context" "TourContext" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE INDEX "Tour_space_roomTypeId_variant_stage_status_idx" ON "Tour"("space", "roomTypeId", "variant", "stage", "status");

-- CreateIndex
CREATE INDEX "TourEvent_tourId_createdAt_idx" ON "TourEvent"("tourId", "createdAt");

-- CreateIndex
CREATE INDEX "TourEvent_sessionId_idx" ON "TourEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourHotspot" ADD CONSTRAINT "TourHotspot_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourEvent" ADD CONSTRAINT "TourEvent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
