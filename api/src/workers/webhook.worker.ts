import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";

export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);
  },
  {
    connection: redisConnectionOptions,
  },
);
