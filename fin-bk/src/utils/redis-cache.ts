import { redis } from "../config/redis";

import type { TObjectId } from "../types/types";

const invalidateCacheByPattern = async (pattern: string) => {
  let cursor = "0";

  do {
    try {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );

      if (keys.length > 0) {
        await redis.unlink(keys);
      }

      cursor = nextCursor;
    } catch (error) {
      console.error("Error invalidating cache by pattern:", error);
      throw error;
    }
  } while (cursor !== "0");
};

export const invalidateUserTransactionCache = (userId: TObjectId) => {
  return invalidateCacheByPattern(`transactions:${userId}:*`);
};

export const invalidateUserBudgetCache = (userId: TObjectId) => {
  return invalidateCacheByPattern(`budgets:${userId}:*`);
};
