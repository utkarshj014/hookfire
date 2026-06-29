import { Router } from "express";
import { getMetricsHandler, getQueueMetricsHandler } from "../controllers/metrics.controller.js";

const router = Router();

router.get("/", getMetricsHandler);
router.get("/queues", getQueueMetricsHandler);

export default router;
