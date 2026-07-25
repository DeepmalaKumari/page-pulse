import { LRUCache } from "lru-cache";
import { redis } from "./redis.js";

const memoryCache = new LRUCache<string, Record<string, any>>({
  max: 500,
});

const DEFAULT_TTL_SECONDS = 300;

export async function getCached<T>(
  key: string,
): Promise<T | null> {
  const memoryValue = memoryCache.get(key);

  if (memoryValue !== undefined) {
    return memoryValue as T;
  }

  if (!redis || !redis.isReady) {
    return null;
  }

  try {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as T;

    memoryCache.set(key, parsed as Record<string, any>);

    return parsed;
  } catch (error) {
    console.error("Cache read failed:", error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  memoryCache.set(key, value as Record<string, any>, {
    ttl: ttlSeconds * 1000,
  });

  if (!redis || !redis.isReady) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error("Cache write failed:", error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  memoryCache.delete(key);

  if (!redis || !redis.isReady) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete failed:", error);
  }
}