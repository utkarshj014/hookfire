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

export async function getAllDeliveries(page: number, limit: number) {
  const [data, total] = await prisma.$transaction([
    prisma.delivery.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),

    prisma.delivery.count(),
  ]);

  return { data, total };
}

export async function getDeliveryById(deliveryId: string) {
  return prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      event: true,
      endpoint: true,
    },
  });
}

export async function getTotalDeliveriesCount() {
  return prisma.delivery.count();
}
export async function getSuccessDeliveriesCount() {
  return prisma.delivery.count({
    where: {
      status: "SUCCESS",
    },
  });
}
export async function getFailedDeliveriesCount() {
  return prisma.delivery.count({
    where: {
      status: "FAILED",
    },
  });
}
