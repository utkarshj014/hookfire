import { Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";
import { processFanOutJob } from "../processors/fanOut.processor.js";

export const fanOutWorker = new Worker(
  "fan-out",
  async (job) => {
    await processFanOutJob(job);
  },
  {
    connection: redisConnectionOptions,
  },
);
