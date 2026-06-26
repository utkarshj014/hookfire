import "dotenv/config";
import { Router } from "express";
import { generateSignature } from "../utils/signature.js";
import { acquireIdempotencyKey } from "../services/idempotency.service.js";

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

  const receivedSignature = req.header("X-Hookfire-Signature");

  const expectedSignature = generateSignature(
    JSON.stringify(req.body),
    // process.env.WEBHOOK_SECRET || "",
    "my-test-secret",
  );

  if (receivedSignature !== expectedSignature) {
    console.log("Signature mismatch! Webhook request may not be authentic.");
    return res
      .status(401)
      .json({ success: false, message: "Invalid signature" });
  }

  console.log("Webhook request is authentic.");

  return res.status(200).json({ success: true });
});

export default router;
