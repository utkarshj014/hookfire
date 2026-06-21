import express from "express";
import eventRoutes from "./routes/event.routes.js";

const app = express();

app.use(express.json());

app.use("/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("Hookfire API RUNNING!!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
