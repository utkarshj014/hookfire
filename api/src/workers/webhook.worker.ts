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
  },
);

webhookWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err.message);
});
