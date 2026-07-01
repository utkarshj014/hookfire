import { Router } from "express";
import {
  getAllEndpointsHandler,
  createEndpointHandler,
  updateEndpointHandler,
  deleteEndpointHandler,
  rotateSecretHandler,
} from "../controllers/webhook-endpoint.controller.js";

const router = Router();

router.get("/", getAllEndpointsHandler);
router.post("/", createEndpointHandler);
router.patch("/:id", updateEndpointHandler);
router.delete("/:id", deleteEndpointHandler);
router.post("/:id/rotate-secret", rotateSecretHandler);

export default router;
