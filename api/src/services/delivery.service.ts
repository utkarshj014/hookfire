import { prisma } from "../lib/prisma.js";

export async function createDelivery(eventId: string, endpointId: string) {
  return prisma.delivery.create({
    data: {
      eventId,
      endpointId,
      status: "PENDING",
    },
  });
}

export async function markDeliverySuccess(id: string) {
  return prisma.delivery.update({
    where: { id },
    data: {
      status: "SUCCESS",
      attempts: { increment: 1 },
    },
  });
}

export async function markDeliveryFailed(id: string, errorMessage: string) {
  return prisma.delivery.update({
    where: { id },
    data: {
      status: "FAILED",
      errorMessage,
      attempts: { increment: 1 },
    },
  });
}
