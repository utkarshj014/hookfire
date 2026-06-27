import { Router } from "express";
import { getMetricsHandler } from "../controllers/metrics.controller.js";

const router = Router();

router.get("/", getMetricsHandler);

export default router;
