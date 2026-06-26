import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";

export const fanOutQueue = new Queue("fan-out", {
  connection: redisConnectionOptions,
});
