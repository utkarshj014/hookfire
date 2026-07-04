import axios from "axios";
import { generateSignature } from "../utils/signature.js";
import { getEndpointById } from "./webhook-endpoint.service.js";
import { decryptSecret } from "../utils/crypto.js";
import { UnrecoverableError } from "bullmq";
import { logger } from "../lib/logger.js";

export async function deliverWebhookJob(
  endpointId: string,
  eventType: string,
  payload: any,
  deliveryId: string,
  attemptNumber: number = 1,
) {
  const body = {
    eventType,
    payload,
  };

  const webhookEndpoint = await getEndpointById(endpointId);

  if (!webhookEndpoint) {
    throw new UnrecoverableError(
      `Webhook endpoint with ID ${endpointId} not found`,
    );
  }

  if (!webhookEndpoint.isActive) {
    throw new Error(`Webhook endpoint with ID ${endpointId} is inactive`);
  }

  // Deterministic Demo Scenario Failure Injection
  if (eventType.startsWith("demo.")) {
    // Add artificial delay to simulate latency and make Active states observable
    await new Promise((resolve) => setTimeout(resolve, 900));

    if (eventType === "demo.payment.succeeded" && attemptNumber === 1) {
      throw new Error("Demo injected failure (Attempt 1 of 3)");
    }
    if (eventType === "demo.invoice.failed" && attemptNumber <= 2) {
      throw new Error(`Demo injected failure (Attempt ${attemptNumber} of 3)`);
    }
    if (eventType === "demo.refund.processed") {
      if (attemptNumber <= 3) {
        throw new Error(
          `Demo injected failure (Attempt ${attemptNumber} of 3)`,
        );
      } else if (attemptNumber >= 4) {
        // Endpoint A/C succeed, Endpoint B/D fail
        if (
          webhookEndpoint.url.includes("endpoint=b") ||
          webhookEndpoint.url.includes("endpoint=d")
        ) {
          throw new Error(
            `Demo injected permanent retry failure (Attempt ${attemptNumber})`,
          );
        }
      }
    }
  }

  let decryptedSecret: string;
  try {
    decryptedSecret = decryptSecret(
      webhookEndpoint.secretEncrypted,
      webhookEndpoint.secretIv,
      webhookEndpoint.secretTag,
    );
  } catch (cryptoErr: any) {
    throw new UnrecoverableError(
      `Failed to decrypt endpoint secret: ${cryptoErr.message || String(cryptoErr)}`,
    );
  }

  let previousSecret: string | null = null;
  if (
    webhookEndpoint.previousSecretEncrypted &&
    webhookEndpoint.previousSecretIv &&
    webhookEndpoint.previousSecretTag &&
    webhookEndpoint.rotatedAt
  ) {
    const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours
    const timeSinceRotation = Date.now() - webhookEndpoint.rotatedAt.getTime();
    if (timeSinceRotation < gracePeriodMs) {
      try {
        previousSecret = decryptSecret(
          webhookEndpoint.previousSecretEncrypted,
          webhookEndpoint.previousSecretIv,
          webhookEndpoint.previousSecretTag,
        );
      } catch (cryptoErr: any) {
        logger.warn(
          { endpointId, error: cryptoErr },
          "Failed to decrypt previous endpoint secret. Proceeding with active secret only.",
        );
      }
    }
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringifiedBody = JSON.stringify(body);
  const signaturePayload = `${timestamp}.${stringifiedBody}`;

  const activeSignature = generateSignature(signaturePayload, decryptedSecret);

  const signatures = [`v1=${activeSignature}`];

  if (previousSecret) {
    const prevSignature = generateSignature(signaturePayload, previousSecret);
    signatures.push(`v0=${prevSignature}`);
  }

  const signatureHeader = signatures.join(",");

  try {
    const response = await axios.post(webhookEndpoint.url, stringifiedBody, {
      headers: {
        "Content-Type": "application/json",
        "X-Hookfire-Signature": signatureHeader,
        "X-Hookfire-Timestamp": timestamp,
        "X-Hookfire-Delivery-Id": deliveryId,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || String(error);
    throw new Error(message, { cause: error });
  }
}
