import { LRUCache } from "lru-cache";
import { redis } from "./redis.js";

const memoryCache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 60_000,
});

export async function getCached<T>(key: string): Promise<T | null> {
  if (redis?.isReady) {
    try {
      const value = await redis.get(key);

      if (value) {
        return JSON.parse(value) as T;
      }

      return null;
    } catch (error) {
      console.warn("Redis read failed. Using memory cache:", error);
    }
  }

  return (memoryCache.get(key) as T | undefined) ?? null;
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  memoryCache.set(key, value, {
    ttl: ttlSeconds * 1000,
  });

  if (redis?.isReady) {
    try {
      await redis.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (error) {
      console.warn("Redis write failed. Using memory cache:", error);
    }
  }
}

export async function deleteCached(key: string): Promise<void> {
  memoryCache.delete(key);

  if (redis?.isReady) {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn("Redis delete failed:", error);
    }
  }
}