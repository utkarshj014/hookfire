import { getEndpointsForEvent } from "../services/webhook-endpoint.service.js";
import { getOrCreateDelivery } from "../services/delivery.service.js";
import { enqueueWebhookJob } from "../services/queue.service.js";
import { logger } from "../lib/logger.js";

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500,
  backoffFactor = 2,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryWithBackoff(
      fn,
      retries - 1,
      delayMs * backoffFactor,
      backoffFactor,
    );
  }
}

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
      return retryWithBackoff(
        async () => {
          const delivery = await getOrCreateDelivery(eventId, endpoint.id);
          return enqueueWebhookJob(eventId, endpoint.id, delivery.id);
        },
        3,
        500,
        2,
      );
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
        "Fan-out isolation failure: Failed to enqueue delivery job for endpoint after retries",
      );
    }
  });
}
