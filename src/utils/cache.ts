import { redis } from "./redis.js";

const DEFAULT_TTL_SECONDS = Number(
  process.env.CACHE_TTL_SECONDS ?? 60,
);

export async function getCached<T>(
  key: string,
): Promise<T | undefined> {
  try {
    if (!redis.isReady) {
      return undefined;
    }

    const value = await redis.get(key);

    if (!value) {
      return undefined;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Cache read failed:", error);
    return undefined;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    if (!redis.isReady) {
      return;
    }

    await redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error("Cache write failed:", error);
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (!redis.isReady) {
      return;
    }

    if (key) {
      await redis.del(key);
    }
  } catch (error) {
    console.error("Cache clear failed:", error);
  }
}