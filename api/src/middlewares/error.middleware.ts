import type { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): Response {
  console.error("Unhandled API error caught by middleware:", err);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
