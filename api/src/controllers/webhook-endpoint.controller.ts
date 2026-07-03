import type { Request, Response, NextFunction } from "express";
import {
  CreateWebhookEndpointSchema,
  UpdateWebhookEndpointSchema,
  RotateSecretSchema,
} from "../validators/webhook-endpoint.validator.js";
import {
  getAllEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  rotateEndpointSecret,
} from "../services/webhook-endpoint.service.js";

export async function getAllEndpointsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const endpoints = await getAllEndpoints();
    return res.status(200).json({
      success: true,
      message: "Webhook endpoints retrieved successfully",
      data: endpoints,
    });
  } catch (error) {
    next(error);
  }
}

export async function createEndpointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const parsedBody = CreateWebhookEndpointSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parsedBody.error.issues.map((issue) => issue.message),
      });
    }

    const { url, secret, subscriptions } = parsedBody.data;

    const result = await createWebhookEndpoint(url, secret, subscriptions);

    return res.status(201).json({
      success: true,
      message: "Webhook endpoint created successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "ENDPOINT_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A webhook endpoint with this URL already exists. If you want to modify its settings, please update the existing one instead.",
      });
    }
    next(error);
  }
}

export async function updateEndpointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing webhook endpoint ID",
      });
    }

    const parsedBody = UpdateWebhookEndpointSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parsedBody.error.issues.map((issue) => issue.message),
      });
    }

    const result = await updateWebhookEndpoint(id, parsedBody.data);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Webhook endpoint not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Webhook endpoint updated successfully",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "ENDPOINT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Webhook endpoint not found",
      });
    }
    if (error.message === "ENDPOINT_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "Cannot update this endpoint because another endpoint with the same URL already exists.",
      });
    }
    next(error);
  }
}

export async function deleteEndpointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing webhook endpoint ID",
      });
    }

    await deleteWebhookEndpoint(id);

    return res.status(200).json({
      success: true,
      message: "Webhook endpoint deleted successfully",
    });
  } catch (error: any) {
    if (error.message === "CANNOT_DELETE_HAS_DELIVERIES") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete endpoints with delivery history. If you do not want to use this endpoint, please deactivate it instead.",
      });
    }
    next(error);
  }
}

export async function rotateSecretHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing webhook endpoint ID",
      });
    }

    const parsedBody = RotateSecretSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parsedBody.error.issues.map((issue) => issue.message),
      });
    }

    const { secret } = parsedBody.data;

    const result = await rotateEndpointSecret(id, secret);

    return res.status(200).json({
      success: true,
      message: "Webhook endpoint secret rotated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
