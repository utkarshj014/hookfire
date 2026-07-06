import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { processFanoutJob } from "../processors/fanout.processor.js";

export const fanoutWorker = new Worker(
  "fanout-webhook",
  async (job) => {
    await processFanoutJob(job.data);
  },
  {
    connection: redisConnectionOptions,
  },
);

fanoutWorker.on("completed", (job) => {
  console.log(`Fanout worker job ${job.id} completed successfully`);
});

fanoutWorker.on("failed", (job, err) => {
  console.error(
    `Fanout worker job ${job?.id} failed with error: ${err.message}`,
  );
});
