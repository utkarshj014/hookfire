import type { Request, Response, NextFunction } from "express";
import { webhookQueue } from "../queues/webhook.queue.js";

export async function getDlqHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const failedJobs = await webhookQueue.getFailed(0, 100);

    const formattedJobs = failedJobs.map((job) => ({
      jobId: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    }));

    return res.status(200).json({
      success: true,
      message: "Dead Letter Queue retrieved successfully",
      data: formattedJobs,
    });
  } catch (error) {
    next(error);
  }
}

export async function retryDlqHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Missing required jobId parameter",
      });
    }

    const job = await webhookQueue.getJob(jobId as string);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Failed job not found in DLQ queue",
      });
    }

    // Move job to waiting state again
    await job.retry();

    return res.status(200).json({
      success: true,
      message: `Job ${jobId} successfully retried from DLQ`,
      data: { jobId },
    });
  } catch (error) {
    next(error);
  }
}
