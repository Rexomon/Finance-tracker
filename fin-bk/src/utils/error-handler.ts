import { RedisLockError } from "./redis-lock";

export type Result<S, E> =
  | { success: true; data: S }
  | { success: false; error: E };

export function success<const S>(data: S): Result<S, never> {
  return { success: true, data };
}

export function error<const E>(error: E): Result<never, E> {
  return { success: false, error };
}

export async function tryCatch<S>(
  operation: () => Promise<S>,
): Promise<{ success: true; data: S } | { success: false; error: unknown }> {
  try {
    return success(await operation());
  } catch (err: unknown) {
    return error(err);
  }
}

export function handleError(error: unknown): {
  code: 500 | 429;
  message: string;
} {
  if (error instanceof RedisLockError && error.code === "LOCK_ACQUIRE_FAILED") {
    return {
      code: 429,
      message: "Too many requests, please wait a moment and try again",
    };
  }

  console.error(error);
  return { code: 500, message: "An internal server error occurred" };
}
