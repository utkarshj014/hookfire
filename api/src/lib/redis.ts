import { Redis } from "ioredis";
import { redisConnectionOptions } from "../config/redis.js";

export const redis = new Redis({
  host: redisConnectionOptions.host,
  port: redisConnectionOptions.port,
  password: redisConnectionOptions.password,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
});

redis.on("error", (err) => {
  console.error("Shared Redis client connection error:", err);
});
