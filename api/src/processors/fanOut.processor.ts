import { getActiveEndpoints } from "../services/webhook-endpoint.service.js";
import { createDelivery } from "../services/delivery.service.js";
import { enqueueWebhookJob } from "../services/queue.service.js";

export async function processFanOutJob(eventId: string) {
  const endpoints = await getActiveEndpoints();

  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const delivery = await createDelivery(eventId, endpoint.id);

      return enqueueWebhookJob(eventId, endpoint.id, delivery.id);
    }),
  );

  results.forEach((result, index) => {
    const endpoint = endpoints[index]!;

    if (result.status === "rejected") {
      console.error(
        `Failed to initiate webhook flow for Endpoint ${endpoint.id}:`,
        result.reason,
      );
      // Note: We can add an optional database update here to mark this delivery row as "SETUP_FAILED"
    }
  });
}
