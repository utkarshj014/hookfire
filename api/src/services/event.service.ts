import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueWebhookJob } from "./queue.service.js";
import { createDelivery } from "./delivery.service.js";
import { getActiveEndpoints } from "./webhook-endpoint.service.js";

export async function createEvent(
  eventType: string,
  payload: Prisma.InputJsonValue,
) {
  const event = await prisma.event.create({ data: { eventType, payload } });

  const endpoints = await getActiveEndpoints();

  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const delivery = await createDelivery(event.id, endpoint.id);

      return enqueueWebhookJob(event.id, endpoint.id, delivery.id);
    }),
  );

  results.forEach((result, index) => {
    const endpoint = endpoints[index]!;

    if (result.status === "rejected") {
      console.error(
        `Failed to initiate webhook flow for Endpoint ${endpoint.id}:`,
        result.reason,
      );
      // Note: You can add an optional database update here to mark this delivery row as "SETUP_FAILED"
    }
  });

  return event;
}

export async function getAllEvents() {
  return prisma.event.findMany();
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}
