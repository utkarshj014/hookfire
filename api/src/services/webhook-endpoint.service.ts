import { prisma } from "../lib/prisma.js";

export async function getActiveEndpoints() {
  return prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
    },
  });
}

export async function getEndpointById(id: string) {
  return prisma.webhookEndpoint.findUnique({
    where: {
      id,
    },
  });
}
