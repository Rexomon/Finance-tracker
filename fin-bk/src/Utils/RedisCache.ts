import Redis from "../Config/Redis";

import type { TObjectId } from "../Types/types";

const invalidateCacheByPattern = async (pattern: string) => {
  let cursor = "0";
  let lastError: Error | null = null;

  do {
    try {
      const [nextCursor, keys] = await Redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );

      if (keys.length > 0) {
        await Redis.unlink(keys);
      }

      cursor = nextCursor;
    } catch (error) {
      console.error("Error invalidating cache by pattern:", error);
      lastError = error as Error;
    }
  } while (cursor !== "0");

  if (lastError) {
    throw lastError;
  }
};

export const invalidateUserTransactionCache = (userId: TObjectId) => {
  return invalidateCacheByPattern(`transactions:${userId}:*`);
};

export const invalidateUserBudgetCache = (userId: TObjectId) => {
  return invalidateCacheByPattern(`budgets:${userId}:*`);
};
