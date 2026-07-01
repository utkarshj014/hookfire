import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueFanOutJob } from "./queue.service.js";

export async function createEvent(
  eventType: string,
  payload: Prisma.InputJsonValue,
) {
  const event = await prisma.event.create({ data: { eventType, payload } });

  // NOTE: DB write and Redis queueing are non-transactional. If Redis fails, the event is saved
  // but dispatch won't trigger. To guarantee at-least-once delivery at scale, we could use
  // the Transactional Outbox Pattern (write to an outbox table in the same DB tx, then poll and enqueue via a worker).
  await enqueueFanOutJob(event.id, eventType);

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
