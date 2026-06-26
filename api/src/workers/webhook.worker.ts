import { Worker } from "bullmq";
import { processWebhookJob } from "../processors/webhook.processor.js";
import { redisConnectionOptions } from "../config/redis.js";
import { markDeliveryFailed } from "../services/delivery.service.js";

export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    await processWebhookJob(job);
  },
  {
    connection: redisConnectionOptions,
  },
);

webhookWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

webhookWorker.on("failed", async (job, err) => {
  if (!job) return;
  const maxAttempts = job?.opts?.attempts ?? 0;

  if (job.attemptsMade < maxAttempts) {
    console.log(
      `Job ${job?.id} failed with error: ${err.message}. Retrying...`,
    );
  } else {
    await markDeliveryFailed(job.data.deliveryId, err.message);

    console.error(
      `Job ${job?.id} failed permanently with error: ${err.message}.`,
    );
  }
});
