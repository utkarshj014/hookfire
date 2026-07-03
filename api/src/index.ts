import express, { type Application } from "express";
import eventRoutes from "./routes/event.routes.js";
import webhookTestRoutes from "./routes/webhook-test.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import metricRoutes from "./routes/metrics.routes.js";
import dlqRoutes from "./routes/dlq.routes.js";
import endpointRoutes from "./routes/webhook-endpoint.routes.js";
import cors, { type CorsOptions } from "cors";
import { env } from "./config/env.js";
import { loggingMiddleware } from "./middlewares/logging.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app: Application = express();

app.use(loggingMiddleware);

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | undefined) => void,
  ) => {
    if (!origin) return callback(null, true);

    if (env.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Hookfire-Signature",
    "X-Hookfire-Timestamp",
    "X-Hookfire-Delivery-Id"
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Target ONLY the webhook-test routes to capture raw buffers
app.use(
  "/webhook-test",
  express.raw({ type: "application/json" }),
  webhookTestRoutes,
);

// Global JSON body parser for all other routes
app.use(express.json());

app.use("/events", eventRoutes);
app.use("/deliveries", deliveryRoutes);
app.use("/metrics", metricRoutes);
app.use("/dlq", dlqRoutes);
app.use("/endpoints", endpointRoutes);

app.get("/", (_req, res) => {
  res.send("Hookfire API RUNNING!!");
});

// Centralized error handler
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
