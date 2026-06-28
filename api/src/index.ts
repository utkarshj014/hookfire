import express, { type Application } from "express";
import eventRoutes from "./routes/event.routes.js";
import webhookTestRoutes from "./routes/webhook-test.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import metricRoutes from "./routes/metrics.routes.js";
import cors, { type CorsOptions } from "cors";

const app: Application = express();

const allowedOrigins = ["http://localhost:5173"];

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | undefined) => void,
  ) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Hookfire_Delivery-Key"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());

app.use("/events", eventRoutes);
app.use("/webhook-test", webhookTestRoutes);
app.use("/deliveries", deliveryRoutes);
app.use("/metrics", metricRoutes);

app.get("/", (req, res) => {
  res.send("Hookfire API RUNNING!!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
