/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `webhook_endpoint` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoint_url_key" ON "webhook_endpoint"("url");
