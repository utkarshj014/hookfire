import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  console.log("Webhook test route is working!");
  console.log("Request body:", req.body);

  res.status(200).json({ success: true });
});

export default router;
