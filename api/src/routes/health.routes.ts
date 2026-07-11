import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

const router = Router();

router.get("/", async (req, res) => {
  const health = {
    status: "UP",
    timestamp: new Date().toISOString(),
    services: {
      express: { status: "UP" },
      postgres: { status: "DOWN" },
      redis: { status: "DOWN" },
    },
  };

  let hasError = false;

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.postgres.status = "UP";
  } catch (err) {
    console.error("Health check failed for PostgreSQL:", err);
    hasError = true;
  }

  // Check Redis
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      health.services.redis.status = "UP";
    } else {
      hasError = true;
    }
  } catch (err) {
    console.error("Health check failed for Redis:", err);
    hasError = true;
  }

  if (hasError) {
    health.status = "DOWN";
    res.status(503).json(health);
    return;
  }

  res.status(200).json(health);
});

export default router;
