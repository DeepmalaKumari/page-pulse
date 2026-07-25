import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl
  ? createClient({ url: redisUrl })
  : null;

if (redis) {
  redis.on("error", (error) => {
    console.error("Redis client error:", error.message);
  });
}

export async function connectRedis(): Promise<void> {
  if (!redis) {
    console.log("Redis not configured. Using in-memory cache.");
    return;
  }

  if (!redis.isOpen) {
    try {
      await redis.connect();
      console.log("Redis connected");
    } catch (error) {
      console.warn(
        "Redis unavailable. Continuing without Redis and using in-memory cache.",
      );
    }
  }
}