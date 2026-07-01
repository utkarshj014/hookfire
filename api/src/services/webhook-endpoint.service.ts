import { prisma } from "../lib/prisma.js";
import { encryptSecret } from "../utils/crypto.js";
import crypto from "crypto";

export async function getAllEndpoints() {
  return prisma.webhookEndpoint.findMany({
    include: {
      subscriptions: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getActiveEndpoints() {
  return prisma.webhookEndpoint.findMany({
    where: {
      isActive: true,
    },
    include: {
      subscriptions: true,
    },
  });
}

export async function getEndpointById(id: string) {
  return prisma.webhookEndpoint.findUnique({
    where: {
      id,
    },
    include: {
      subscriptions: true,
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

export async function createWebhookEndpoint(url: string, secret?: string, subscriptions: string[] = []) {
  const actualSecret = secret || crypto.randomBytes(24).toString("hex");
  const { encrypted, iv, tag } = encryptSecret(actualSecret);

  return prisma.$transaction(async (tx) => {
    const endpoint = await tx.webhookEndpoint.create({
      data: {
        url,
        secretEncrypted: encrypted,
        secretIv: iv,
        secretTag: tag,
        isActive: true,
      },
    });

    if (subscriptions.length > 0) {
      await tx.endpointSubscription.createMany({
        data: subscriptions.map((eventType) => ({
          endpointId: endpoint.id,
          eventType,
        })),
      });
    }

    // Return the endpoint along with the raw secret so the user can copy it once on creation
    return {
      ...endpoint,
      rawSecret: actualSecret,
      subscriptions: subscriptions.map(eventType => ({ eventType })),
    };
  });
}

export async function updateWebhookEndpoint(
  id: string,
  data: { url?: string | undefined; isActive?: boolean | undefined; subscriptions?: string[] | undefined }
) {
  return prisma.$transaction(async (tx) => {
    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const endpoint = await tx.webhookEndpoint.update({
      where: { id },
      data: updateData,
    });

    if (data.subscriptions !== undefined) {
      // Delete existing subscriptions
      await tx.endpointSubscription.deleteMany({
        where: { endpointId: id },
      });

      // Create new subscriptions
      if (data.subscriptions.length > 0) {
        await tx.endpointSubscription.createMany({
          data: data.subscriptions.map((eventType) => ({
            endpointId: id,
            eventType,
          })),
        });
      }
    }

    return tx.webhookEndpoint.findUnique({
      where: { id },
      include: {
        subscriptions: true,
      },
    });
  });
}

export async function rotateEndpointSecret(id: string, newSecret?: string | undefined) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
  });
  if (!endpoint) {
    throw new Error(`Endpoint with ID ${id} not found`);
  }

  const actualSecret = newSecret || crypto.randomBytes(24).toString("hex");
  const { encrypted, iv, tag } = encryptSecret(actualSecret);

  const updatedEndpoint = await prisma.webhookEndpoint.update({
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

  return {
    ...updatedEndpoint,
    rawSecret: actualSecret,
  };
}

export async function deleteWebhookEndpoint(id: string) {
  return prisma.webhookEndpoint.delete({
    where: { id },
  });
}
