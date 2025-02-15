-- AlterTable
ALTER TABLE "Shift" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX "Shift_employeeId_idx" ON "Shift"("employeeId");

-- CreateIndex
CREATE INDEX "Shift_jobId_idx" ON "Shift"("jobId");
