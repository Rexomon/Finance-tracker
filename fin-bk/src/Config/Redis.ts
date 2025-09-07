import Redis from "ioredis";

const RedisUrl = Bun.env.REDIS_URL;

if (!RedisUrl) {
  throw new Error("REDIS_URL environment variable is not set");
}

const redis = new Redis(RedisUrl, {
  retryStrategy(times) {
    const MaxRetries = 3;

    if (times >= MaxRetries) {
      console.error("Max retries reached. Closing Redis connection.");
      return null;
    }

    const delay = Math.min(times * 1000, 5000);
    console.log(`Retrying Redis connection in ${delay}ms...`);

    return delay;
  },

  maxRetriesPerRequest: null,
  commandTimeout: 5000,
  connectTimeout: 10000,
  enableReadyCheck: true,
});

export const safelyCloseRedis = async () => {
  try {
    if (redis.status === "end" || redis.status === "close") return;

    if (redis.status === "ready") {
      await redis.quit();
      console.log("Redis connection closed safely.");
    } else {
      redis.disconnect();
      console.log("Redis connection disconnected.");
    }
  } catch (error) {
    console.error(`Error closing Redis connection: ${error}`);
  }
};

redis.on("connect", () => {
  console.log("🚀 Redis connected");
});

redis.on("error", (error) => {
  console.error(`Redis not connected, ${error}`);
});

export default redis;
