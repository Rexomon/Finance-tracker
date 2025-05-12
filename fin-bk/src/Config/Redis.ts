import Redis from "ioredis";

const RedisUri = Bun.env.REDIS_URL as string;

const redis = new Redis(RedisUri);

redis.on("connect", () => {
  console.log("🚀 Redis connected");
});

redis.on("error", (error) => {

  console.error("Redis not connected,", error);
});

export default redis;
