/*
  Warnings:

  - You are about to drop the column `attempts` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `delivery` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "delivery" DROP COLUMN "attempts",
DROP COLUMN "errorMessage",
ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "latestError" TEXT;

-- CreateTable
CREATE TABLE "delivery_attempt" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_attempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
