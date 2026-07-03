import { Router } from "express";
import { verifySignature } from "../utils/signature.js";
import { acquireIdempotencyKey } from "../services/idempotency.service.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { decryptSecret } from "../utils/crypto.js";

const router = Router();

router.post("/", async (req, res) => {
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

  const receivedSignatureHeader = req.header("X-Hookfire-Signature");
  if (!receivedSignatureHeader) {
    return res
      .status(400)
      .json({ message: "Missing required X-Hookfire-Signature header" });
  }

  // Extract the raw body buffer upfront
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {}),
      );

  // Fail fast if request body is empty
  if (rawBody.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid request body.",
    });
  }

  // Fail fast if request body is not valid JSON
  try {
    JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    console.log("Request body is not valid JSON:", rawBody.toString("utf8"));
    return res.status(400).json({
      success: false,
      message: "Invalid request body.",
    });
  }

  // Parse the X-Hookfire-Signature header which may contain both the active and previous secret during a secret rotation grace period.
  // 1. Gather all signatures using safe string slicing if present (e.g., v1=sig1,v0=sig2 -> [sig1, sig2]).
  const signatures = receivedSignatureHeader.split(",").map((s) => {
    const trimmed = s.trim();
    const eqIndex = trimmed.indexOf("=");
    return eqIndex !== -1 ? trimmed.slice(eqIndex + 1) : trimmed;
  });

  // This is only a mock implementation, for demo purposes.
  // In a real scenario, the secretsToCheck will be populated from the receiver's database of secrets and their state.
  const secretsToCheck: string[] = [];
  secretsToCheck.push(env.WEBHOOK_SECRET);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: true,
      },
    });

    if (delivery?.endpoint) {
      const endpoint = delivery.endpoint;
      const decryptedSecret = decryptSecret(
        endpoint.secretEncrypted,
        endpoint.secretIv,
        endpoint.secretTag,
      );
      secretsToCheck.push(decryptedSecret);

      if (
        endpoint.previousSecretEncrypted &&
        endpoint.previousSecretIv &&
        endpoint.previousSecretTag &&
        endpoint.rotatedAt
      ) {
        const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours
        const timeSinceRotation = Date.now() - endpoint.rotatedAt.getTime();
        if (timeSinceRotation < gracePeriodMs) {
          const decryptedPrevSecret = decryptSecret(
            endpoint.previousSecretEncrypted,
            endpoint.previousSecretIv,
            endpoint.previousSecretTag,
          );
          secretsToCheck.push(decryptedPrevSecret);
        }
      }
    }
  } catch (err) {
    console.error(
      "Error looking up endpoint secret for signature verification:",
      err,
    );
    return res.status(503).json({
      success: false,
      message: "Webhook delivery system is temporarily unavailable.",
    });
  }

  const signaturePayload = Buffer.from(
    `${receivedTimestampStr}.${rawBody.toString("utf8")}`,
  );

  // The receiver is expected to update their secret key configuration to the new rotated secret within this grace period.
  // Since the publisher signs with both, the verification will succeed using either the old or new key during the transition.
  const isValid = signatures.some((sig) =>
    secretsToCheck.some((secret) =>
      verifySignature(signaturePayload, secret, sig),
    ),
  );

  if (!isValid) {
    console.log("Signature mismatch! Webhook request may not be authentic.");
    return res
      .status(401)
      .json({ success: false, message: "Invalid signature." });
  }

  const isAlreadyProcessed = await acquireIdempotencyKey(deliveryId);
  if (isAlreadyProcessed) {
    console.log("Webhook already processed!");
    return res.status(200).json({ success: true });
  }

  console.log("New webhook received.");

  return res.status(200).json({ success: true });
});

export default router;
