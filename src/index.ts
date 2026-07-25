import app from "./app.js";
import { connectRedis } from "./utils/redis.js";

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await connectRedis();
    console.log("Redis connected");
  } catch (error) {
    console.warn(
      "Redis unavailable. Continuing with in-memory cache.",
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Page Pulse running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});