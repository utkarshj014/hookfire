import { Worker } from "bullmq";
import { processWebhookJob } from "../processors/webhook.processor.js";
import { redisConnectionOptions } from "../config/redis.js";
export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    await processWebhookJob(job);
  },
  {
    connection: redisConnectionOptions,
    // For DEMO purpose concurrency is 10 else could be 50
    concurrency: 10,
  },
);

webhookWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

webhookWorker.on("failed", (job, err) => {
  if (!job) return;
  const maxAttempts = job?.opts?.attempts ?? 0;

  if (job.attemptsMade < maxAttempts) {
    console.log(
      `Job ${job?.id} failed with error: ${err.message}. Retrying...`,
    );
  } else {
    console.error(
      `Job ${job?.id} failed permanently with error: ${err.message}.`,
    );
  }
});
