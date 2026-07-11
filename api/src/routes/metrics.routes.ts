import { Router } from "express";
import {
  getMetricsHandler,
  getQueueMetricsHandler,
} from "../controllers/metrics.controller.js";
import { readLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.get("/", readLimiter, getMetricsHandler);
router.get("/queues", readLimiter, getQueueMetricsHandler);

export default router;
