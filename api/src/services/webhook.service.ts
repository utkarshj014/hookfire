import axios from "axios";

const WEBHOOK_TARGET_URL =
  process.env.WEBHOOK_TARGET_URL || "http://localhost:3000/webhook-test";

export async function deliverWebhookJob(eventType: string, payload: any) {
  try {
    const response = await axios.post(WEBHOOK_TARGET_URL, {
      eventType,
      payload,
    });
    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error delivering webhook job:", message);
    throw error;
  }
}
