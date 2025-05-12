import Redis from "ioredis";

const RedisUrl = Bun.env.REDIS_URL as string;

const redis = new Redis(RedisUrl);

redis.on("connect", () => {
  console.log("🚀 Redis connected");
});

redis.on("error", (error) => {

  console.error("Redis not connected,", error);
});

export default redis;
