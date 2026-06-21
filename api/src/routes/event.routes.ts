import { Router } from "express";
import {
  createEventHandler,
  getAllEventsHandler,
  getEventByIdHandler,
} from "../controllers/event.controller.js";

const router = Router();

router
  .post("/", createEventHandler)
  .get("/", getAllEventsHandler)
  .get("/:id", getEventByIdHandler);

export default router;
