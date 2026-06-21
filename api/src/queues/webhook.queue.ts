import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis.js";

export const webhookQueue = new Queue("webhook-delivery", {
  connection: redisConnectionOptions,
});
