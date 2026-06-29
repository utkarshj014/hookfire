/*
  Warnings:

  - You are about to drop the column `secret` on the `webhook_endpoint` table. All the data in the column will be lost.
  - Added the required column `secretEncrypted` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secretIv` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secretTag` to the `webhook_endpoint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "webhook_endpoint" DROP COLUMN "secret",
ADD COLUMN     "previousSecretEncrypted" TEXT,
ADD COLUMN     "previousSecretIv" TEXT,
ADD COLUMN     "previousSecretTag" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3),
ADD COLUMN     "secretEncrypted" TEXT NOT NULL,
ADD COLUMN     "secretIv" TEXT NOT NULL,
ADD COLUMN     "secretTag" TEXT NOT NULL;
