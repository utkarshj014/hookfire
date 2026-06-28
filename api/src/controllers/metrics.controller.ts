import type { Request, Response, NextFunction } from "express";
import { getTotalEventsCount } from "../services/event.service.js";
import {
  getTotalDeliveriesCount,
  getSuccessDeliveriesCount,
  getFailedDeliveriesCount,
} from "../services/delivery.service.js";

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
