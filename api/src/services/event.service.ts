import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueWebhookJob } from "./queue.service.js";
import { createDelivery } from "./delivery.service.js";

export async function createEvent(
  eventType: string,
  payload: Prisma.InputJsonValue,
) {
  const event = await prisma.event.create({ data: { eventType, payload } });

  await createDelivery(event.id);

  await enqueueWebhookJob(event.id);

  return event;
}

export async function getAllEvents() {
  return prisma.event.findMany();
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}
