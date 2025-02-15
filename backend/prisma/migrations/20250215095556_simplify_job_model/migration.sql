/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryLocation` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedHours` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `floorNumber` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `hasElevator` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfMovers` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLocation` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `specialRequirements` on the `Job` table. All the data in the column will be lost.
  - Added the required column `location` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "deliveryLocation",
DROP COLUMN "estimatedHours",
DROP COLUMN "floorNumber",
DROP COLUMN "hasElevator",
DROP COLUMN "items",
DROP COLUMN "numberOfMovers",
DROP COLUMN "pickupLocation",
DROP COLUMN "specialRequirements",
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "requirements" TEXT[];
