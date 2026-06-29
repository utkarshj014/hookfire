import type { Request, Response, NextFunction } from "express";
import { getTotalEventsCount } from "../services/event.service.js";
import {
  getTotalDeliveriesCount,
  getSuccessDeliveriesCount,
  getFailedDeliveriesCount,
} from "../services/delivery.service.js";
import { webhookQueue } from "../queues/webhook.queue.js";

export async function getMetricsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const totalEvents = await getTotalEventsCount();

    const totalDeliveries = await getTotalDeliveriesCount();

    const successfulDeliveries = await getSuccessDeliveriesCount();
    const failedDeliveries = await getFailedDeliveriesCount();

    const successRate =
      totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    return res.status(200).json({
      success: true,
      message: "Metrics retrieved successfully",
      data: {
        totalEvents,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQueueMetricsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const counts = await webhookQueue.getJobCounts();

    return res.status(200).json({
      success: true,
      message: "Queue metrics retrieved successfully",
      data: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
