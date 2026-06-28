import { Router } from "express";
import { verifySignature } from "../utils/signature.js";
import { acquireIdempotencyKey } from "../services/idempotency.service.js";
import { env } from "../config/env.js";

const router = Router();

router.post("/", async (req, res) => {
  console.log("Webhook test route is working!");
  console.log("Request body:", req.body);

  const deliveryId = req.header("X-Hookfire-Delivery-Id");

  if (!deliveryId) {
    return res
      .status(400)
      .json({ message: "Missing required X-Hookfire-Delivery-Id header" });
  }

  const isAlreadyProcessed = await acquireIdempotencyKey(deliveryId);
  if (isAlreadyProcessed) {
    console.log("Webhook already processed!");
    return res.status(200).json({ success: true });
  }

  console.log("New webhook received.");

  const receivedSignature = req.header("X-Hookfire-Signature") || "";

  const isValid = verifySignature(
    req.body,
    env.WEBHOOK_SECRET || "my-test-secret",
    receivedSignature,
  );

  if (!isValid) {
    console.log("Signature mismatch! Webhook request may not be authentic.");
    return res
      .status(401)
      .json({ success: false, message: "Invalid signature" });
  }

  const payload = JSON.parse(req.body.toString("utf-8"));

  console.log("Webhook request is authentic.");

  return res.status(200).json({ success: true });
});

export default router;
