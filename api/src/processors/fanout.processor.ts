import { getEndpointsForEvent } from "../services/webhook-endpoint.service.js";
import { getOrCreateDelivery } from "../services/delivery.service.js";
import { enqueueWebhookJob } from "../services/queue.service.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

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

export async function processFanoutJob({
  eventId,
  eventType,
}: {
  eventId: string;
  eventType: string;
}) {
  const endpoints = await getEndpointsForEvent(eventType);

  if (endpoints.length === 0) {
    logger.info(
      { eventId, eventType },
      `No active endpoints subscribed to event type "${eventType}". Skipping fan-out.`,
    );
    return;
  }

  logger.info(
    { eventId, eventType, matchingEndpointsCount: endpoints.length },
    `Starting fan-out for event type "${eventType}"`,
  );

  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      let deliveryId: string | undefined;
      try {
        return await retryWithBackoff(
          async () => {
            const delivery = await getOrCreateDelivery(eventId, endpoint.id);
            deliveryId = delivery.id;
            // ONLY FOR DEMO purpose, we send isDemo in job
            const isDemo = eventType.startsWith("demo.");
            return enqueueWebhookJob(eventId, endpoint.id, delivery.id, isDemo);
          },
          3,
          500,
          2,
        );
      } catch (err: any) {
        if (deliveryId) {
          try {
            await prisma.delivery.update({
              where: { id: deliveryId },
              data: {
                status: "FAILED",
                latestError: `Failed to enqueue delivery job: ${err.message || String(err)}`,
              },
            });
          } catch (updateDbErr) {
            logger.error(
              { deliveryId, error: updateDbErr },
              "Failed to update delivery status to FAILED after enqueuing failed",
            );
          }
        }
        throw err;
      }
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
