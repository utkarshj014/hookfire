import type { Request, Response } from "express";
import { CreateEventSchema } from "../validators/event.validator.js";
import {
  createEvent,
  getAllEvents,
  getEventById,
} from "../services/event.service.js";
import type { Prisma } from "@prisma/client";

export async function createEventHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const parsedBody = CreateEventSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsedBody.error.issues.map((issue) => issue.message),
      });
    }

    const { eventType, payload } = parsedBody.data;

    const event = await createEvent(
      eventType,
      payload as Prisma.InputJsonValue,
    );

    return res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);

    return res.status(500).json({ message: "Failed to create event" });
  }
}

export async function getAllEventsHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const events = await getAllEvents();

    return res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);

    return res.status(500).json({ message: "Failed to fetch events" });
  }
}

export async function getEventByIdHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Invalid or missing event ID" });
    }

    const event = await getEventById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error(`Error fetching event with ID: ${req.params.id}:`, error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
}
