import Redis from "ioredis";

const RedisUrl = Bun.env.REDIS_URL;

if (!RedisUrl) {
	console.error("REDIS_URL environment variable is not set");
	process.exit(1);
}

const redis = new Redis(RedisUrl, {
	connectTimeout: 10000,
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
});

export const safelyCloseRedis = async () => {
	try {
		await redis.quit();
		console.log("Redis connection closed safely.");
	} catch (error) {
		console.error("Error closing Redis connection:", error);
	}
};

redis.on("connect", () => {
	console.log("🚀 Redis connected");
});

redis.on("error", (error) => {
	console.error("Redis not connected,", error);
});

export default redis;
