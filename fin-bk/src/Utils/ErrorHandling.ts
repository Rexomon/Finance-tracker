import { RedisLockError } from "./RedisLocking";

export function handleError(error: unknown): { code: number; message: string } {
  if (error instanceof RedisLockError && error.code === "LOCK_ACQUIRE_FAILED") {
    return {
      code: 429,
      message: "Too many requests, please wait a moment and try again",
    };
  }

  console.error(error);
  return { code: 500, message: "An internal server error occurred" };
}
