import axios from "axios";
import { generateSignature } from "../utils/signature.js";

const WEBHOOK_TARGET_URL =
  process.env.WEBHOOK_TARGET_URL || "http://localhost:3000/webhook-test";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export async function deliverWebhookJob(eventType: string, payload: any) {
  try {
    const body = {
      eventType,
      payload,
    };

    const signature = generateSignature(JSON.stringify(body), WEBHOOK_SECRET);

    const response = await axios.post(WEBHOOK_TARGET_URL, body, {
      headers: {
        "X-Hookfire-Signature": signature,
      },
    });

    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error delivering webhook job:", message);
    throw error;
  }
}
