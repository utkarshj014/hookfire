import axios from "axios";
import { generateSignature } from "../utils/signature.js";
import { getEndpointById } from "./webhook-endpoint.service.js";
import { decryptSecret } from "../utils/crypto.js";

export async function deliverWebhookJob(
  endpointId: string,
  eventType: string,
  payload: any,
  deliveryId: string,
) {
  try {
    const body = {
      eventType,
      payload,
    };

    const webhookEndpoint = await getEndpointById(endpointId);

    if (!webhookEndpoint) {
      throw new Error("No valid webhook-endpoint!");
    }

    const decryptedSecret = decryptSecret(
      webhookEndpoint.secretEncrypted,
      webhookEndpoint.secretIv,
      webhookEndpoint.secretTag,
    );

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
        previousSecret = decryptSecret(
          webhookEndpoint.previousSecretEncrypted,
          webhookEndpoint.previousSecretIv,
          webhookEndpoint.previousSecretTag,
        );
      }
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringifiedBody = JSON.stringify(body);
    const signaturePayload = `${timestamp}.${stringifiedBody}`;
    
    const activeSignature = generateSignature(
      signaturePayload,
      decryptedSecret,
    );
    const signatures = [`v1=${activeSignature}`];

    if (previousSecret) {
      const prevSignature = generateSignature(
        signaturePayload,
        previousSecret,
      );
      signatures.push(`v0=${prevSignature}`);
    }

    const signatureHeader = signatures.join(",");

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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error delivering webhook job:", message);
    throw error;
  }
}
