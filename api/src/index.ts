import express from "express";
import eventRoutes from "./routes/event.routes.js";
import webhookTestRoutes from "./routes/webhook-test.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import metricRoutes from "./routes/metrics.routes.js";

const app = express();

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
