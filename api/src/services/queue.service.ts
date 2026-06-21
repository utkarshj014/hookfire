import { webhookQueue } from "../queues/webhook.queue.js";

export async function enqueueWebhookJob(eventId: string) {
  return webhookQueue.add("deliver-webhook", { eventId });
}
