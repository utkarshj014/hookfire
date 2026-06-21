import { Queue } from "bullmq";

export const webhookQueue = new Queue("webhook-delivery", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});
