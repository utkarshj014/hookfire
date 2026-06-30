/*
  Warnings:

  - You are about to drop the column `attemptCount` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `endpointId` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `lastAttemptAt` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `latestError` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `attemptNumber` on the `delivery_attempt` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryId` on the `delivery_attempt` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `delivery_attempt` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `delivery_attempt` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `delivery_attempt` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `previousSecretEncrypted` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `previousSecretIv` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `previousSecretTag` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `rotatedAt` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `secretEncrypted` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `secretIv` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the column `secretTag` on the `webhook_endpoint` table. All the data in the column will be lost.
  - You are about to drop the `processed-webhook` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `endpoint_id` to the `delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_id` to the `delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attempt_number` to the `delivery_attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_id` to the `delivery_attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finished_at` to the `delivery_attempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_type` to the `event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secret_encrypted` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secret_iv` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secret_tag` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "delivery" DROP CONSTRAINT "delivery_endpointId_fkey";

-- DropForeignKey
ALTER TABLE "delivery" DROP CONSTRAINT "delivery_eventId_fkey";

-- DropForeignKey
ALTER TABLE "delivery_attempt" DROP CONSTRAINT "delivery_attempt_deliveryId_fkey";

-- AlterTable
ALTER TABLE "delivery" DROP COLUMN "attemptCount",
DROP COLUMN "createdAt",
DROP COLUMN "endpointId",
DROP COLUMN "eventId",
DROP COLUMN "lastAttemptAt",
DROP COLUMN "latestError",
DROP COLUMN "updatedAt",
ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endpoint_id" TEXT NOT NULL,
ADD COLUMN     "event_id" TEXT NOT NULL,
ADD COLUMN     "last_attempt_at" TIMESTAMP(3),
ADD COLUMN     "latest_error" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "delivery_attempt" DROP COLUMN "attemptNumber",
DROP COLUMN "deliveryId",
DROP COLUMN "errorMessage",
DROP COLUMN "finishedAt",
DROP COLUMN "startedAt",
ADD COLUMN     "attempt_number" INTEGER NOT NULL,
ADD COLUMN     "delivery_id" TEXT NOT NULL,
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "finished_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "event" DROP COLUMN "createdAt",
DROP COLUMN "eventType",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "event_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "webhook_endpoint" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "previousSecretEncrypted",
DROP COLUMN "previousSecretIv",
DROP COLUMN "previousSecretTag",
DROP COLUMN "rotatedAt",
DROP COLUMN "secretEncrypted",
DROP COLUMN "secretIv",
DROP COLUMN "secretTag",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "previous_secret_encrypted" TEXT,
ADD COLUMN     "previous_secret_iv" TEXT,
ADD COLUMN     "previous_secret_tag" TEXT,
ADD COLUMN     "rotated_at" TIMESTAMP(3),
ADD COLUMN     "secret_encrypted" TEXT NOT NULL,
ADD COLUMN     "secret_iv" TEXT NOT NULL,
ADD COLUMN     "secret_tag" TEXT NOT NULL;

-- DropTable
DROP TABLE "processed-webhook";

-- CreateTable
CREATE TABLE "endpoint_subscription" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endpoint_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_subscription_endpoint_id_event_type_key" ON "endpoint_subscription"("endpoint_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_delivery_id_key" ON "processed_webhook"("delivery_id");

-- CreateIndex
CREATE INDEX "delivery_status_idx" ON "delivery"("status");

-- CreateIndex
CREATE INDEX "delivery_event_id_endpoint_id_idx" ON "delivery"("event_id", "endpoint_id");

-- CreateIndex
CREATE INDEX "delivery_attempt_delivery_id_idx" ON "delivery_attempt"("delivery_id");

-- CreateIndex
CREATE INDEX "event_event_type_created_at_idx" ON "event"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoint_subscription" ADD CONSTRAINT "endpoint_subscription_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
