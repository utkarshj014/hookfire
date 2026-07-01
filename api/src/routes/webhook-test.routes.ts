import { Router } from "express";
import { verifySignature } from "../utils/signature.js";
import { acquireIdempotencyKey } from "../services/idempotency.service.js";
import { env } from "../config/env.js";

const router = Router();

router.post("/", async (req, res) => {
  console.log("Webhook test route is working!");

  const receivedTimestampStr = req.header("X-Hookfire-Timestamp");
  if (!receivedTimestampStr) {
    return res
      .status(400)
      .json({ message: "Missing required X-Hookfire-Timestamp header" });
  }

  const receivedTimestamp = parseInt(receivedTimestampStr, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const fiveMinutesInSeconds = 5 * 60;

  if (
    isNaN(receivedTimestamp) ||
    Math.abs(currentTimestamp - receivedTimestamp) > fiveMinutesInSeconds
  ) {
    console.log(
      "Timestamp validation failed. Request timestamp is too old or invalid.",
    );
    return res.status(401).json({
      success: false,
      message: "Request expired or invalid timestamp",
    });
  }

  const deliveryId = req.header("X-Hookfire-Delivery-Id");

  if (!deliveryId) {
    return res
      .status(400)
      .json({ message: "Missing required X-Hookfire-Delivery-Id header" });
  }

  const rawBody = req.body;

  const receivedSignatureHeader = req.header("X-Hookfire-Signature") || "";

  // Parse the X-Hookfire-Signature header which may contain multiple signatures during secret rotation.
  // We extract the signature value, stripping the scheme prefix if present (e.g., v1=sig1,v0=sig2 -> [sig1, sig2]).
  const signatures = receivedSignatureHeader.split(",").map((s) => {
    const parts = s.trim().split("=");
    return parts.length === 2 ? parts[1]! : s.trim();
  });

  const signaturePayload = Buffer.from(
    `${receivedTimestampStr}.${rawBody.toString("utf8")}`,
  );

  // NOTE: In production, the receiver only verifies against their single active secret.
  // During a secret rotation grace period, the publisher sends signatures for both the active and
  // previous secret. The receiver is expected to update their secret key configuration to the new
  // rotated secret within this grace period. Since the publisher signs with both, the verification
  // will succeed using either the old or new key during the transition.
  const isValid = signatures.some((sig) =>
    verifySignature(signaturePayload, env.WEBHOOK_SECRET, sig),
  );

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
    return res.status(400).json({
      success: false,
      message: "Invalid request body",
    });
  }

  const isAlreadyProcessed = await acquireIdempotencyKey(deliveryId);
  if (isAlreadyProcessed) {
    console.log("Webhook already processed!");
    return res.status(200).json({ success: true });
  }

  console.log("New webhook received.");

  console.log("Webhook request is authentic.");

  return res.status(200).json({ success: true });
});

export default router;
