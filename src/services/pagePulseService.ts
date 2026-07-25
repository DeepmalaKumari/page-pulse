import pLimit from "p-limit";
import { getCached, setCached } from "../utils/cache.js";

export type PagePulseResult = {
  url: string;
  statusCode: number;
  reachable: boolean;
  responseTimeMs: number;
  auditedAt: string;
};

const MAX_CONCURRENT_AUDITS = Number(
  process.env.MAX_CONCURRENT_AUDITS ?? 10,
);

const auditLimiter = pLimit(MAX_CONCURRENT_AUDITS);

async function performCheck(url: string): Promise<PagePulseResult> {
  const cached = await getCached<PagePulseResult>(url);

  if (cached) {
    return cached;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    const result: PagePulseResult = {
      url,
      statusCode: response.status,
      reachable: response.ok,
      responseTimeMs: Date.now() - startTime,
      auditedAt: new Date().toISOString(),
    };

    await setCached(url, result);

    return result;
  } catch {
    const result: PagePulseResult = {
      url,
      statusCode: 0,
      reachable: false,
      responseTimeMs: Date.now() - startTime,
      auditedAt: new Date().toISOString(),
    };

    await setCached(url, result);

    return result;
  }
}

export function checkPage(url: string): Promise<PagePulseResult> {
  return auditLimiter(() => performCheck(url));
}