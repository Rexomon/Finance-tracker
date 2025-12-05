import { Elysia } from "elysia";
import { randomUUIDv7 } from "bun";

import Redis from "../Config/Redis";

export class RedisLockError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "RedisLockError";
    this.code = code;
  }
}

export const RedisLock = new Elysia().decorate("lock", {
  acquire: async (keyString: string) => {
    const ERROR_CODE = "LOCK_ACQUIRE_FAILED";

    const lockKey = `lock:${keyString}`;
    const lockToken = randomUUIDv7();

    const lockAcquired = await Redis.set(lockKey, lockToken, "EX", 5, "NX");
    if (!lockAcquired) {
      throw new RedisLockError("Redis lock acquire failed", ERROR_CODE);
    }

    return lockToken;
  },

  release: async (keyString: string, lockToken: string) => {
    const ERROR_CODE = "LOCK_RELEASE_FAILED";

    const lockKey = `lock:${keyString}`;

    const currentToken = await Redis.get(lockKey);
    if (currentToken !== lockToken) {
      throw new RedisLockError(
        "Redis lock release failed: token mismatch",
        ERROR_CODE,
      );
    }

    await Redis.del(lockKey);
  },
});
