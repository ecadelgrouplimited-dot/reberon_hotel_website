-- CreateEnum
CREATE TYPE "HkTaskKind" AS ENUM ('DEPARTURE', 'STAYOVER', 'INSPECTION', 'DEEP_CLEAN', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "HkTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'INSPECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RoomBlockReason" AS ENUM ('MAINTENANCE', 'OWNER_USE', 'STAFF', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "FeedbackScore" AS ENUM ('GOOD', 'OK', 'BAD');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "guestNotes" TEXT,
ADD COLUMN     "idDocLast4" TEXT,
ADD COLUMN     "idDocNumberEnc" TEXT,
ADD COLUMN     "idDocType" TEXT,
ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mergedIntoId" UUID,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "preferredRoomTypeId" UUID,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInById" UUID,
ADD COLUMN     "checkedOutAt" TIMESTAMP(3),
ADD COLUMN     "checkedOutById" UUID;

-- CreateTable
CREATE TABLE "RoomAssignment" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "reservationRoomId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "HkTaskKind" NOT NULL,
    "status" "HkTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "assigneeId" UUID,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "inspectedAt" TIMESTAMP(3),
    "inspectedById" UUID,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBlock" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" "RoomBlockReason" NOT NULL,
    "note" TEXT,
    "createdById" UUID,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "score" "FeedbackScore" NOT NULL,
    "comment" TEXT,
    "allowPublic" BOOLEAN NOT NULL DEFAULT false,
    "testimonialId" UUID,
    "handledAt" TIMESTAMP(3),
    "handledById" UUID,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomAssignment_roomId_fromDate_toDate_idx" ON "RoomAssignment"("roomId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "HousekeepingTask_date_status_idx" ON "HousekeepingTask"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HousekeepingTask_roomId_date_kind_key" ON "HousekeepingTask"("roomId", "date", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_reservationId_key" ON "Feedback"("reservationId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAssignment" ADD CONSTRAINT "RoomAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBlock" ADD CONSTRAINT "RoomBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── The house's hard rules (hand-written) ──
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "RoomAssignment" ADD CONSTRAINT room_assignment_dates_ordered CHECK ("fromDate" < "toDate");
ALTER TABLE "RoomBlock"      ADD CONSTRAINT room_block_dates_ordered      CHECK ("fromDate" < "toDate");

-- One physical room is never given to two stays for the same night.
ALTER TABLE "RoomAssignment" ADD CONSTRAINT room_never_double_assigned
  EXCLUDE USING gist ("roomId" WITH =, daterange("fromDate", "toDate") WITH &&) WHERE ("releasedAt" IS NULL);

-- One physical room carries at most one live block for a night.
ALTER TABLE "RoomBlock" ADD CONSTRAINT room_block_no_overlap
  EXCLUDE USING gist ("roomId" WITH =, daterange("fromDate", "toDate") WITH &&) WHERE ("releasedAt" IS NULL);

