import { getEndpointsForEvent } from "../services/webhook-endpoint.service.js";
import { createDelivery } from "../services/delivery.service.js";
import { enqueueWebhookJob } from "../services/queue.service.js";
import { logger } from "../lib/logger.js";

export async function processFanOutJob({
  eventId,
  eventType,
}: {
  eventId: string;
  eventType: string;
}) {
  const endpoints = await getEndpointsForEvent(eventType);

  logger.info(
    { eventId, eventType, matchingEndpointsCount: endpoints.length },
    `Starting fan-out for event type "${eventType}"`,
  );

  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const delivery = await createDelivery(eventId, endpoint.id);
      return enqueueWebhookJob(eventId, endpoint.id, delivery.id);
    }),
  );

  results.forEach((result, index) => {
    const endpoint = endpoints[index]!;

    if (result.status === "rejected") {
      logger.error(
        {
          endpointId: endpoint.id,
          endpointUrl: endpoint.url,
          eventId,
          eventType,
          error: result.reason?.message || String(result.reason),
        },
        "Fan-out isolation failure: Failed to enqueue delivery job for endpoint",
      );
    }
  });
}
