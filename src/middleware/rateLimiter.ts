import type { Request, Response, NextFunction } from "express";

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.ip || "unknown";
  const now = Date.now();

  const current = requests.get(key);

  if (!current || now > current.resetAt) {
    requests.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return next();
  }

  if (current.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    });
  }

  current.count++;

  next();
}
