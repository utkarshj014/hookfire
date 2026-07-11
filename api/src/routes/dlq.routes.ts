import { Router } from "express";
import {
  getDlqHandler,
  retryDlqHandler,
} from "../controllers/dlq.controller.js";
import { readLimiter, strictOperationLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.get("/", readLimiter, getDlqHandler);
router.post("/:jobId/retry", strictOperationLimiter, retryDlqHandler);

export default router;
