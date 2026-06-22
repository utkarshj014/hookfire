import { Worker } from "bullmq";
import { processWebhookJob } from "../processors/webhook.processor.js";
import { redisConnectionOptions } from "../config/redis.js";

export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    await processWebhookJob(job.data.eventId);
  },
  {
    connection: redisConnectionOptions,
  },
);
