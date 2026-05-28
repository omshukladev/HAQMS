-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "QueueToken" DROP CONSTRAINT "QueueToken_doctorId_fkey";

-- DropIndex
DROP INDEX "QueueToken_doctorId_tokenNumber_createdAt_key";

-- DropIndex
DROP INDEX "QueueToken_doctorId_createdAt_idx";

-- AlterTable
ALTER TABLE "QueueToken" ADD COLUMN     "queueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill queueDate to the day bucket already used by the check-in flow.
UPDATE "QueueToken"
SET "queueDate" = date_trunc('day', "createdAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_doctorId_queueDate_tokenNumber_key" ON "QueueToken"("doctorId", "queueDate", "tokenNumber");

-- CreateIndex
CREATE INDEX "QueueToken_doctorId_queueDate_idx" ON "QueueToken"("doctorId", "queueDate");
