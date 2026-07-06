import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";

export const fanoutQueue = new Queue("fanout-queue", {
  connection: redisConnectionOptions,
});
