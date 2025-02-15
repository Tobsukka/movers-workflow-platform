/*
  Warnings:

  - Added the required column `jobId` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "jobId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
