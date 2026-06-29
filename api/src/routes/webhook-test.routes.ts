import { Router } from "express";
import { verifySignature } from "../utils/signature.js";
import { acquireIdempotencyKey } from "../services/idempotency.service.js";
import { env } from "../config/env.js";

const router = Router();

router.post("/", async (req, res) => {
  console.log("Webhook test route is working!");

  const rawBody = req.body;

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

  // 1. Try active secret
  let isValid = verifySignature(rawBody, env.WEBHOOK_SECRET, receivedSignature);

  // 2. Try previous secret rotation (fallback to my-test-secret)
  if (!isValid) {
    console.log(
      "Active signature mismatch, attempting previous secret rotation check...",
    );
    isValid = verifySignature(rawBody, "my-test-secret", receivedSignature);
  }

  if (!isValid) {
    console.log("Signature mismatch! Webhook request may not be authentic.");
    return res
      .status(401)
      .json({ success: false, message: "Invalid signature" });
  }

  try {
    const parsedPayload = JSON.parse(rawBody.toString("utf8"));
    console.log("Request body payload:", parsedPayload);
  } catch (err) {
    console.log("Request body is not valid JSON:", rawBody.toString("utf8"));
  }

  console.log("Webhook request is authentic.");

  return res.status(200).json({ success: true });
});

export default router;
