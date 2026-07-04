import { webhookQueue } from "../queues/webhook.queue.js";
import { fanOutQueue } from "../queues/fanOut.queue.js";

export async function enqueueWebhookJob(
  eventId: string,
  endpointId: string,
  deliveryId: string,
  isDemo: boolean = false,
) {
  return webhookQueue.add(
    "deliver-webhook",
    { eventId, endpointId, deliveryId },
    {
      jobId: deliveryId,
      attempts: 3,
      backoff: {
        type: "exponential",
        // For DEMO purpose delay is 4s else could be 1s for next retry
        delay: isDemo ? 4000 : 1000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  );
}

export async function enqueueFanOutJob(eventId: string, eventType: string) {
  return fanOutQueue.add(
    "fan-out",
    { eventId, eventType },
    {
      jobId: eventId,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  );
}
