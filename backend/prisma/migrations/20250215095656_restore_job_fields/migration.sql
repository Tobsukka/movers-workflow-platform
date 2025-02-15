/*
  Warnings:

  - You are about to drop the column `location` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `Job` table. All the data in the column will be lost.
  - Added the required column `customerName` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryLocation` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estimatedHours` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfMovers` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupLocation` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "location",
DROP COLUMN "requirements",
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "deliveryLocation" TEXT NOT NULL,
ADD COLUMN     "estimatedHours" INTEGER NOT NULL,
ADD COLUMN     "floorNumber" INTEGER,
ADD COLUMN     "hasElevator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "items" TEXT[],
ADD COLUMN     "numberOfMovers" INTEGER NOT NULL,
ADD COLUMN     "pickupLocation" TEXT NOT NULL,
ADD COLUMN     "specialRequirements" TEXT;
