import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,
      },
    })
  : null;

if (redis) {
  redis.on("error", (error) => {
    console.warn("Redis unavailable. Using in-memory cache.", error.message);
  });
}

export async function connectRedis(): Promise<void> {
  if (!redis || redis.isOpen) {
    return;
  }

  try {
    await redis.connect();
  } catch {
    console.warn("Redis unavailable. Continuing without Redis.");
  }
}