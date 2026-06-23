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
