import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client = null;

try {
  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ (blocking commands)
    retryStrategy(times) {
      if (times > 5) {
        console.warn("[Redis] Max retries reached — running without cache.");
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("connect", () => console.log("⚡ Redis connected."));
  client.on("error", (err) => console.warn("[Redis] Connection error:", err.message));

  // Attempt connection — don't block startup if it fails
  await client.connect().catch(() => {
    console.warn("[Redis] Could not connect — caching disabled.");
    client = null;
  });
} catch (err) {
  console.warn("[Redis] Init error — caching disabled:", err.message);
  client = null;
}

export default client;
