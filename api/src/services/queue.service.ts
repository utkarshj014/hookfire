import { webhookQueue } from "../queues/webhook.queue.js";

export async function enqueueWebhookJob(
  eventId: string,
  endpointId: string,
  deliveryId: string,
) {
  return webhookQueue.add(
    "deliver-webhook",
    { eventId, endpointId, deliveryId },
    {
      attempts: 1,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
}
