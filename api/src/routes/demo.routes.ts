import { Router } from "express";
import { createWebhookEndpoint } from "../services/webhook-endpoint.service.js";
import { createEvent } from "../services/event.service.js";
import { env } from "../config/env.js";

const router = Router();

let isDemoRunning = false;

const ROOT_URL = env.APP_URL;

const DEMO_ENDPOINTS = [
  {
    url: `${ROOT_URL}/webhook-test?endpoint=a`,
    secret: "demo-signing-secret-a-948294",
    subscriptions: [
      "demo.user.created",
      "demo.payment.succeeded",
      "demo.invoice.failed",
      "demo.refund.processed",
    ],
  },
  {
    url: `${ROOT_URL}/webhook-test?endpoint=b`,
    secret: "demo-signing-secret-b-948294",
    subscriptions: [
      "demo.user.created",
      "demo.order.shipped",
      "demo.refund.processed",
    ],
  },
  {
    url: `${ROOT_URL}/webhook-test?endpoint=c`,
    secret: "demo-signing-secret-c-948294",
    subscriptions: [
      "demo.payment.succeeded",
      "demo.invoice.failed",
      "demo.order.shipped",
    ],
  },
  {
    url: `${ROOT_URL}/webhook-test?endpoint=d`,
    secret: "demo-signing-secret-d-948294",
    subscriptions: ["demo.invoice.failed", "demo.refund.processed"],
  },
];

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
  for (const ep of DEMO_ENDPOINTS) {
    try {
      await createWebhookEndpoint(ep.url, ep.secret, ep.subscriptions);
    } catch (err: any) {
      const isAlreadyExists =
        err.message === "ENDPOINT_ALREADY_EXISTS" || err.code === "P2002";
      if (!isAlreadyExists) {
        throw err;
      }
    }
  }
}

router.post("/start", async (req, res, next): Promise<any> => {
  try {
    if (isDemoRunning) {
      return res.status(400).json({
        success: false,
        message: "A demo scenario is already running.",
      });
    }

    isDemoRunning = true;

    // Ensure demo endpoints exist before generating events
    await ensureDemoEndpointsExist();

    // Start background event scheduling loop
    runOrchestrator().catch((err) => {
      console.error("Error running demo orchestrator:", err);
      isDemoRunning = false;
    });

    return res.status(200).json({
      success: true,
      message:
        "Demo scenario started successfully. Switch to the Deliveries tab to observe updates.",
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
    },
  });
});

async function runOrchestrator() {
  const totalEvents = 150;
  const batchSize = 5;
  const intervalMs = 2.5 * 1000;
  const totalBatches = totalEvents / batchSize;

  for (let batch = 0; batch < totalBatches; batch++) {
    const startIdx = batch * batchSize;

    // Determine event types for this batch of 5 events
    for (let i = 0; i < batchSize; i++) {
      const globalEventIndex = startIdx + i;
      let eventType: string;

      if (globalEventIndex < 50) {
        // First 50 events are only success types
        eventType =
          SUCCESS_EVENT_TYPES[globalEventIndex % SUCCESS_EVENT_TYPES.length]!;
      } else {
        // Last 100 events are mixed
        eventType =
          ALL_EVENT_TYPES[(globalEventIndex - 50) % ALL_EVENT_TYPES.length]!;
      }

      const payload = PAYLOADS[eventType];
      await createEvent(eventType, payload);
    }

    if (batch < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  isDemoRunning = false;
}

export { isDemoRunning };

export default router;
