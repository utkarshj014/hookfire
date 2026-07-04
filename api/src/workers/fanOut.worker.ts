import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { processFanOutJob } from "../processors/fanOut.processor.js";

export const fanOutWorker = new Worker(
  "fan-out",
  async (job) => {
    await processFanOutJob(job.data);
  },
  {
    connection: redisConnectionOptions,
  },
);

fanOutWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

fanOutWorker.on("failed", (job, err) => {
  console.error(`FanOut Job ${job?.id} failed with error: ${err.message}`);
});
