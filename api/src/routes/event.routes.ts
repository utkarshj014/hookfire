import { Router } from "express";
import {
  createEventHandler,
  getAllEventsHandler,
  getEventByIdHandler,
  getDeliveriesByEventIdHandler,
} from "../controllers/event.controller.js";
import { readLimiter, strictOperationLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.post("/", strictOperationLimiter, createEventHandler);
router.get("/", readLimiter, getAllEventsHandler);
router.get("/:id/deliveries", readLimiter, getDeliveriesByEventIdHandler);
router.get("/:id", readLimiter, getEventByIdHandler);

export default router;
