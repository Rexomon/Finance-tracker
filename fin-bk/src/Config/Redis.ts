import Redis from "ioredis";

const RedisUri = Bun.env.REDIS_URI as string;

const redis = new Redis(RedisUri);

redis.on("connect", () => {
  console.log("🚀 Redis connected");
});

redis.on("error", (error) => {
  console.error(error);
});

export default redis;
