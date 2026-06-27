import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueFanOutJob } from "./queue.service.js";

export async function createEvent(
  eventType: string,
  payload: Prisma.InputJsonValue,
) {
  const event = await prisma.event.create({ data: { eventType, payload } });

  await enqueueFanOutJob(event.id);

  return event;
}

export async function getAllEvents() {
  return prisma.event.findMany();
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function getDeliveriesByEventId(eventId: string) {
  return prisma.delivery.findMany({
    where: {
      eventId,
    },
  });
}

export async function getTotalEventsCount() {
  return prisma.event.count();
}
