import type { Request, Response, NextFunction } from "express";
import {
  getAllDeliveries,
  getDeliveryById,
} from "../services/delivery.service.js";

export async function getAllDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);
    const status = req.query.status as string | undefined;

    const { data, total } = await getAllDeliveries(page, limit, status);

    return res.status(200).json({
      success: true,
      message: "Deliveries retrieved successfully",
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing delivery ID",
      });
    }

    const delivery = await getDeliveryById(id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery retrieved successfully",
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
}
