import type { Job } from "bullmq";
import {
  createDeliveryAttempt,
  recordAttemptSuccess,
  recordAttemptFailure,
} from "../services/delivery.service.js";
import { getEventById } from "../services/event.service.js";
import { deliverWebhookJob } from "../services/webhook.service.js";
import { logger } from "../lib/logger.js";

export async function processWebhookJob(job: Job) {
  const { eventId, endpointId, deliveryId } = job.data;

  const event = await getEventById(eventId);

  if (!event) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 3;

  logger.info(
    { jobId: job.id, deliveryId, attempt: attemptNumber, eventId, endpointId },
    "Job started: Webhook delivery attempt initiated",
  );

  const attempt = await createDeliveryAttempt(deliveryId, attemptNumber);

  try {
    const webhookResult = await deliverWebhookJob(
      endpointId,
      event.eventType,
      event.payload,
      deliveryId,
    );

    logger.info(
      { jobId: job.id, deliveryId, attempt: attemptNumber, eventId, endpointId, result: webhookResult },
      "Job completed successfully: Webhook delivered",
    );

    await recordAttemptSuccess(attempt.id, deliveryId);
  } catch (error: any) {
    const isFinalAttempt = attemptNumber >= maxAttempts;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await recordAttemptFailure(attempt.id, deliveryId, errorMessage, isFinalAttempt);

    if (isFinalAttempt) {
      logger.error(
        { jobId: job.id, deliveryId, attempt: attemptNumber, eventId, endpointId, error: errorMessage },
        "Job permanently failed: Webhook retries exhausted",
      );
    } else {
      logger.warn(
        { jobId: job.id, deliveryId, attempt: attemptNumber, eventId, endpointId, error: errorMessage },
        "Job failed: Retry scheduled",
      );
    }

    throw error;
  }
}
