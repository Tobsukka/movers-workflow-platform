-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "additionalExpenses" JSONB,
ADD COLUMN     "breakMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "challenges" TEXT,
ADD COLUMN     "customerSignature" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
