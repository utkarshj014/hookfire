/*
  Warnings:

  - Added the required column `endpointId` to the `delivery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "delivery" ADD COLUMN     "endpointId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "processed-webhook" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed-webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed-webhook_deliveryId_key" ON "processed-webhook"("deliveryId");

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
