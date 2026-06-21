import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function createEvent(
  eventType: string,
  payload: Prisma.InputJsonValue,
) {
  return prisma.event.create({ data: { eventType, payload } });
}

export async function getAllEvents() {
  return prisma.event.findMany();
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}
