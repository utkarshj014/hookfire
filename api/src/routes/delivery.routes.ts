import { Router } from "express";
import {
  getAllDeliveriesHandler,
  getDeliveryByIdHandler,
} from "../controllers/delivery.controller.js";
import { readLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

router.get("/", readLimiter, getAllDeliveriesHandler);
router.get("/:id", readLimiter, getDeliveryByIdHandler);

export default router;
