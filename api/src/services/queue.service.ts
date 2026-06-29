import { webhookQueue } from "../queues/webhook.queue.js";
import { fanOutQueue } from "../queues/fanOut.queue.js";

export async function enqueueWebhookJob(
  eventId: string,
  endpointId: string,
  deliveryId: string,
) {
  return webhookQueue.add(
    "deliver-webhook",
    { eventId, endpointId, deliveryId },
    {
      jobId: deliveryId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
}

export async function enqueueFanOutJob(eventId: string) {
  return fanOutQueue.add("fan-out-job", { eventId });
}
