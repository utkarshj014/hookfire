import "dotenv/config";
import { Router } from "express";
import { generateSignature } from "../utils/signature.js";

const router = Router();

router.post("/", (req, res) => {
  console.log("Webhook test route is working!");
  console.log("Request body:", req.body);

  const receivedSignature = req.header("X-Hookfire-Signature");

  const expectedSignature = generateSignature(
    JSON.stringify(req.body),
    process.env.WEBHOOK_SECRET || "",
  );

  if (receivedSignature !== expectedSignature) {
    console.log("Signature mismatch! Webhook request may not be authentic.");
    return res
      .status(401)
      .json({ success: false, message: "Invalid signature" });
  }

  console.log("Webhook request is authentic.");

  res.status(200).json({ success: true });
});

export default router;
