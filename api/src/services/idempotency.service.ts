import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export async function acquireIdempotencyKey(deliveryId: string) {
  try {
    await prisma.processedWebhook.create({
      data: {
        deliveryId,
      },
    });

    return false;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return true;
    }
    logger.error({ error, deliveryId }, "Error acquiring idempotency key");
    throw error;
  }
}
