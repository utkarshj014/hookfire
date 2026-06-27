import type { Request, Response } from "express";
import {
  getAllDeliveries,
  getDeliveryById,
} from "../services/delivery.service.js";

export async function getAllDeliveriesHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);

    const { data, total } = await getAllDeliveries(page, limit);

    return res.status(200).json({
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
    console.error("Error fetching all deliveries:", error);
    return res.status(500).json({ message: "Failed to fetch deliveries" });
  }
}

export async function getDeliveryByIdHandler(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res
        .status(400)
        .json({ message: "Invalid or missing delivery ID" });
    }

    const delivery = await getDeliveryById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    return res.status(200).json(delivery);
  } catch (error) {
    console.error(`Error fetching delivery with ID: ${req.params.id}:`, error);
    return res.status(500).json({ message: "Failed to fetch delivery" });
  }
}
