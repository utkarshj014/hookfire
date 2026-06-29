import { Router } from "express";
import { getDlqHandler, retryDlqHandler } from "../controllers/dlq.controller.js";

const router = Router();

router.get("/", getDlqHandler);
router.post("/:jobId/retry", retryDlqHandler);

export default router;
