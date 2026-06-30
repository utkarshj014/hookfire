import { prisma } from "../lib/prisma.js";
import { encryptSecret } from "../utils/crypto.js";

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

export async function getEndpointsForEvent(eventType: string) {
  return prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
      subscriptions: {
        some: {
          eventType,
        },
      },
    },
  });
}

export async function createWebhookEndpoint(url: string, secret: string) {
  const { encrypted, iv, tag } = encryptSecret(secret);
  return prisma.webhookEndpoint.create({
    data: {
      url,
      secretEncrypted: encrypted,
      secretIv: iv,
      secretTag: tag,
      isActive: true,
    },
  });
}

export async function rotateEndpointSecret(id: string, newSecret: string) {
  const endpoint = await getEndpointById(id);
  if (!endpoint) {
    throw new Error(`Endpoint with ID ${id} not found`);
  }

  const { encrypted, iv, tag } = encryptSecret(newSecret);

  return prisma.webhookEndpoint.update({
    where: { id },
    data: {
      previousSecretEncrypted: endpoint.secretEncrypted,
      previousSecretIv: endpoint.secretIv,
      previousSecretTag: endpoint.secretTag,
      secretEncrypted: encrypted,
      secretIv: iv,
      secretTag: tag,
      rotatedAt: new Date(),
    },
  });
}
