import { prisma } from "../lib/prisma.js";

export async function createDelivery(eventId: string, endpointId: string) {
  return prisma.delivery.create({
    data: {
      eventId,
      endpointId,
      status: "PENDING",
      attemptCount: 0,
    },
  });
}

export async function createDeliveryAttempt(deliveryId: string, attemptNumber: number) {
  return prisma.deliveryAttempt.create({
    data: {
      deliveryId,
      attemptNumber,
      status: "PENDING",
    },
  });
}

export async function recordAttemptSuccess(attemptId: string, deliveryId: string) {
  return prisma.$transaction([
    prisma.deliveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUCCESS",
      },
    }),
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "SUCCESS",
        attemptCount: { increment: 1 },
        latestError: null,
      },
    }),
  ]);
}

export async function recordAttemptFailure(
  attemptId: string,
  deliveryId: string,
  errorMessage: string,
  isFinalAttempt: boolean,
) {
  return prisma.$transaction([
    prisma.deliveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    }),
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: isFinalAttempt ? "FAILED" : "PENDING",
        attemptCount: { increment: 1 },
        latestError: errorMessage,
      },
    }),
  ]);
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
      attempts: {
        orderBy: {
          attemptNumber: "asc",
        },
      },
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
