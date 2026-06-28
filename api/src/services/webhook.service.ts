import axios from "axios";
import { generateSignature } from "../utils/signature.js";
import { getEndpointById } from "./webhook-endpoint.service.js";

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

    const signature = generateSignature(
      JSON.stringify(body),
      webhookEndpoint.secret,
    );

    const response = await axios.post(webhookEndpoint.url, body, {
      headers: {
        "X-Hookfire-Signature": signature,
        "X-Hookfire-Delivery-Id": deliveryId,
      },
    });

    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error delivering webhook job:", message);
    throw error;
  }
}
