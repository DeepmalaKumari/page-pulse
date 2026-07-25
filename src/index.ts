import app from "./app.js";
import { connectRedis } from "./utils/redis.js";

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Page Pulse running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start application", error);
  process.exit(1);
});