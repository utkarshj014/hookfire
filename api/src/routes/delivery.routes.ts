import { Router } from "express";
import {
  getAllDeliveriesHandler,
  getDeliveryByIdHandler,
} from "../controllers/delivery.controller.js";

const router = Router();

router.get("/", getAllDeliveriesHandler);
router.get("/:id", getDeliveryByIdHandler);

export default router;
