import { Router } from "express";
import {
  getAllEndpointsHandler,
  createEndpointHandler,
  updateEndpointHandler,
  deleteEndpointHandler,
  rotateSecretHandler,
} from "../controllers/webhook-endpoint.controller.js";
import { readLimiter, writeLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.get("/", readLimiter, getAllEndpointsHandler);
router.post("/", writeLimiter, createEndpointHandler);
router.patch("/:id", writeLimiter, updateEndpointHandler);
router.delete("/:id", writeLimiter, deleteEndpointHandler);
router.post("/:id/rotate-secret", writeLimiter, rotateSecretHandler);

export default router;
