import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { checkPage } from "../services/pagePulseService.js";

const requestSchema = z.object({
  url: z.string().url(),
});

export async function checkPageController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = requestSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_URL",
          message: "A valid URL is required",
        },
      });
    }

    const pageResult = await checkPage(result.data.url);

    return res.status(200).json({
      data: pageResult,
    });
  } catch (error) {
    next(error);
  }
}
