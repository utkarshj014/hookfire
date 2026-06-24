import { prisma } from "../lib/prisma.js";

export async function createDelivery(eventId: string) {
  return prisma.delivery.create({
    data: {
      eventId,
      status: "PENDING",
    },
  });
}

export async function markDeliverySuccess(eventId: string) {
  return prisma.delivery.updateMany({
    where: { eventId },
    data: {
      status: "SUCCESS",
      attempts: { increment: 1 },
    },
  });
}

export async function markDeliveryFailed(
  eventId: string,
  errorMessage: string,
) {
  return prisma.delivery.updateMany({
    where: { eventId },
    data: {
      status: "FAILED",
      errorMessage,
      attempts: { increment: 1 },
    },
  });
}
