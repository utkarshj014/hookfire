import type { Request, Response, NextFunction } from "express";
import { CreateEventSchema } from "../validators/event.validator.js";
import {
  createEvent,
  getAllEvents,
  getDeliveriesByEventId,
  getEventById,
} from "../services/event.service.js";
import type { Prisma } from "@prisma/client";

export async function createEventHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const parsedBody = CreateEventSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parsedBody.error.issues.map((issue) => issue.message),
      });
    }

    const { eventType, payload } = parsedBody.data;

    const event = await createEvent(
      eventType,
      payload as Prisma.InputJsonValue,
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllEventsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const events = await getAllEvents();

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEventByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing event ID",
      });
    }

    const event = await getEventById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeliveriesByEventIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing event ID",
      });
    }

    const deliveries = await getDeliveriesByEventId(id);

    if (!deliveries) {
      return res.status(404).json({
        success: false,
        message: "No deliveries found for this event ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Deliveries retrieved successfully",
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
}
