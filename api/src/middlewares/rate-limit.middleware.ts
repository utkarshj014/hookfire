import { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyPrefix, message } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    // Determine client identifier (use IP or proxy header)
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0]?.trim() || "unknown_ip";
    const clientKey = `${keyPrefix}${ip}`;

    try {
      const now = Date.now();
      const clearBefore = now - windowMs;

      // Multi transaction to ensure atomicity
      const multi = redis.multi();
      // Remove timestamps older than the sliding window boundary
      multi.zremrangebyscore(clientKey, 0, clearBefore);
      // Count remaining timestamps in the sliding window
      multi.zcard(clientKey);
      // Add current timestamp to the sorted set
      multi.zadd(clientKey, now, String(now));
      // Set key TTL so inactive IPs are cleaned up automatically
      multi.expire(clientKey, Math.ceil(windowMs / 1000) * 2);

      const results = await multi.exec();

      if (!results) {
        throw new Error("Redis transaction returned null");
      }

      // results is an array of [error, result]
      // zcard is the second command, so index 1
      const zcardResult = results[1];
      if (!zcardResult) {
        throw new Error("Failed to get ZCARD result");
      }

      const [, count] = zcardResult;
      const requestCount = Number(count);

      // Set headers for standard rate limit transparency
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - requestCount));
      res.setHeader("X-RateLimit-Reset", new Date(now + windowMs).toISOString());

      if (requestCount > max) {
        // Remove the last added timestamp if request is blocked
        await redis.zrem(clientKey, String(now));
        
        return res.status(429).json({
          success: false,
          message: message || "Too many requests. Please try again later.",
        });
      }

      next();
    } catch (err) {
      console.error("Rate limiter failure (bypassing limits for safety):", err);
      // Fail open: if Redis fails, do not block users from using the application
      next();
    }
  };
}

// 1. Read limiter (300 requests per minute) - optimized for auto-refresh dashboard polling
export const readLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyPrefix: "ratelimit:read:",
  message: "Too many dashboard refresh requests. Please wait a minute.",
});

// 2. Standard Write limiter (60 requests per minute) - for register/edit endpoints & visitor registration
export const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "ratelimit:write:",
  message: "Too many configuration actions. Please try again in a minute.",
});

// 3. Strict operations limiter (15 requests per minute) - for heavy task runs: event dispatches & demo starts
export const strictOperationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyPrefix: "ratelimit:strict:",
  message: "Operation rate limit exceeded. Please wait a minute before retrying.",
});

// 4. Webhook Ingestion limiter (600 requests per minute) - protects test endpoints from flooding while allowing high-speed fanned webhooks
export const ingestionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  keyPrefix: "ratelimit:ingest:",
  message: "Webhook ingestion limit exceeded. Please slow down your requests.",
});
