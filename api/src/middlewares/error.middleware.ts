import type { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): Response {
  const status = err.status || err.statusCode || 500;
  const isClientError = status >= 400 && status < 500;

  if (!isClientError) {
    console.error("Unhandled API error caught by middleware:", err);
  }

  return res.status(status).json({
    success: false,
    message: isClientError ? err.message : "Internal server error",
  });
}
