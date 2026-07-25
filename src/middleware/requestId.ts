import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = req.header("X-Request-ID") || crypto.randomUUID();

  res.setHeader("X-Request-ID", id);

  next();
}
