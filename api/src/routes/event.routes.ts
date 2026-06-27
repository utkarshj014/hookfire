import { Router } from "express";
import {
  createEventHandler,
  getAllEventsHandler,
  getEventByIdHandler,
  getDeliveriesByEventIdHandler,
} from "../controllers/event.controller.js";

const router = Router();

router
  .post("/", createEventHandler)
  .get("/", getAllEventsHandler)
  .get("/:id/deliveries", getDeliveriesByEventIdHandler)
  .get("/:id", getEventByIdHandler);

export default router;
