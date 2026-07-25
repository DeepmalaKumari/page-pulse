import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = createClient({
  url: redisUrl,
});

redis.on("error", (error) => {
  console.error("Redis client error", error);
});

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}