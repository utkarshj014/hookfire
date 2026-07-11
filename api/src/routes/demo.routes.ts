import { Router } from "express";
import { createWebhookEndpoint } from "../services/webhook-endpoint.service.js";
import { createEvent } from "../services/event.service.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { webhookQueue } from "../queues/webhook.queue.js";
import { fanoutQueue } from "../queues/fanout.queue.js";

const router = Router();

let isDemoRunning = false;
let demoStartedAt: Date | null = null;
let demoStartedBy: string | null = null;

const DEMO_DURATION_SECONDS = 75;
const BUFFER_SECONDS = 15;
const ROOT_URL = env.APP_URL;

const DEMO_ENDPOINTS = ["a", "b", "c", "d"].map((char) => {
  const subs: Record<string, string[]> = {
    a: [
      "demo.user.created",
      "demo.payment.succeeded",
      "demo.invoice.failed",
      "demo.refund.processed",
    ],
    b: ["demo.user.created", "demo.order.shipped", "demo.refund.processed"],
    c: ["demo.payment.succeeded", "demo.invoice.failed", "demo.order.shipped"],
    d: ["demo.invoice.failed", "demo.refund.processed"],
  };
  return {
    url: `${ROOT_URL}/webhook-test?endpoint=${char}`,
    secret: `demo-signing-secret-${char}-948294`,
    subscriptions: subs[char]!,
  };
});

const STANDARD_ENDPOINT = {
  url: `${ROOT_URL}/webhook-test`,
  secret: "standard-signing-secret-948294",
  subscriptions: ["user.created", "payment.succeeded", "order.shipped"],
};

const SUCCESS_EVENT_TYPES = ["demo.user.created", "demo.order.shipped"];
const ALL_EVENT_TYPES = [
  "demo.user.created",
  "demo.order.shipped",
  "demo.payment.succeeded",
  "demo.invoice.failed",
  "demo.refund.processed",
];

const PAYLOADS: Record<string, any> = {
  "demo.user.created": {
    userId: "usr_demo",
    email: "demo-user@example.com",
    name: "Demo User",
  },
  "demo.order.shipped": {
    orderId: "ord_demo",
    trackingNumber: "TRK_DEMO_123",
    carrier: "DHL",
  },
  "demo.payment.succeeded": {
    paymentIntentId: "pi_demo",
    amount: 4900,
    currency: "usd",
  },
  "demo.invoice.failed": {
    invoiceId: "in_demo",
    amountDue: 4900,
    attemptCount: 2,
  },
  "demo.refund.processed": {
    refundId: "re_demo",
    amount: 1500,
    reason: "requested_by_customer",
  },
};

async function ensureDemoEndpointsExist() {
  for (const ep of [...DEMO_ENDPOINTS, STANDARD_ENDPOINT]) {
    await prisma.webhookEndpoint.deleteMany({ where: { url: ep.url } });
    await createWebhookEndpoint(ep.url, ep.secret, ep.subscriptions);
  }
}

async function resetDemoData() {
  await prisma.processedWebhook.deleteMany({});
  await prisma.deliveryAttempt.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.webhookEndpoint.deleteMany({}); // cascades to EndpointSubscription

  try {
    await webhookQueue.obliterate({ force: true });
    await fanoutQueue.obliterate({ force: true });
  } catch (err) {
    console.error("Failed to obliterate queues during reset:", err);
  }

  await ensureDemoEndpointsExist();
}

async function getNextVisitorId(): Promise<number> {
  try {
    const [result] = await prisma.$queryRawUnsafe<{ nextval: string }[]>(
      "SELECT nextval('visitor_counter_seq')::text as nextval",
    );
    return Number(result?.nextval || 1);
  } catch (err) {
    console.error("Failed to get next visitor ID from PostgreSQL:", err);
    return Math.floor(Math.random() * 1000);
  }
}

router.post("/start", async (req, res, next): Promise<any> => {
  try {
    const demoState = {
      isDemoRunning: true,
      startedAt: demoStartedAt,
      startedBy: demoStartedBy,
      durationSeconds: DEMO_DURATION_SECONDS,
      bufferSeconds: BUFFER_SECONDS,
    };

    if (isDemoRunning) {
      return res.status(400).json({
        success: false,
        message: "A demo scenario is already running.",
        data: demoState,
      });
    }

    const visitorId = req.body.visitorId || "Visitor #Unknown";
    isDemoRunning = true;
    demoStartedAt = new Date();
    demoStartedBy = visitorId;

    await resetDemoData();

    runOrchestrator().catch((err) =>
      console.error("Error running demo orchestrator:", err),
    );

    setTimeout(
      () => {
        isDemoRunning = false;
        demoStartedAt = null;
        demoStartedBy = null;
      },
      (DEMO_DURATION_SECONDS + BUFFER_SECONDS) * 1000,
    );

    return res.status(200).json({
      success: true,
      message:
        "Demo scenario started successfully. Switch to the Deliveries tab to observe updates.",
      data: {
        ...demoState,
        startedAt: demoStartedAt,
        startedBy: demoStartedBy,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/status", async (req, res): Promise<any> => {
  return res.status(200).json({
    success: true,
    data: {
      isDemoRunning,
      startedAt: demoStartedAt,
      startedBy: demoStartedBy,
      durationSeconds: DEMO_DURATION_SECONDS,
      bufferSeconds: BUFFER_SECONDS,
      currentTime: new Date(),
    },
  });
});

router.post("/visitor", async (req, res, next): Promise<any> => {
  try {
    const num = await getNextVisitorId();
    return res
      .status(200)
      .json({ success: true, visitorId: `Visitor #${num}` });
  } catch (error) {
    next(error);
  }
});

async function runOrchestrator() {
  const totalEvents = 150;
  const batchSize = 5;
  const intervalMs = 2500;

  for (let batch = 0; batch < totalEvents / batchSize; batch++) {
    for (let i = 0; i < batchSize; i++) {
      const idx = batch * batchSize + i;
      const eventType =
        idx < 50
          ? SUCCESS_EVENT_TYPES[idx % SUCCESS_EVENT_TYPES.length]!
          : ALL_EVENT_TYPES[(idx - 50) % ALL_EVENT_TYPES.length]!;
      await createEvent(eventType, PAYLOADS[eventType]);
    }
    if (batch < totalEvents / batchSize - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

// Seed default endpoints and initialize visitor sequence on route module load
(async () => {
  try {
    await prisma.$executeRawUnsafe(
      "CREATE SEQUENCE IF NOT EXISTS visitor_counter_seq START WITH 1",
    );
    await ensureDemoEndpointsExist();
  } catch (err) {
    console.error("Failed to initialize demo sequence or endpoints on load:", err);
  }
})();

export { isDemoRunning };
export default router;
