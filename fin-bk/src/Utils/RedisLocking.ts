import { Elysia } from "elysia";
import Redis from "../Config/Redis";

export const RedisLock = new Elysia().decorate("lock", {
  acquire: async (keyString: string) => {
    const lockKey = `lock:${keyString}`;

    const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
    if (!lockAcquired) {
      throw new Error("Too many requests");
    }
  },

  release: async (keyString: string) => {
    const lockKey = `lock:${keyString}`;
    await Redis.del(lockKey);
  },
});
