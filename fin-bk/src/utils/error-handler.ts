import { Elysia } from "elysia";

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

export async function tryCatch<S>(operation: () => Promise<S>) {
  try {
    return success(await operation());
  } catch (err: unknown) {
    return error(err);
  }
}

export function handleError(error: unknown): {
  code: 500;
  message: string;
} {
  console.error(error);
  return { code: 500, message: "An internal server error occurred" };
}

export const ErrorHandler = new Elysia()
  .onError(({ error, code, status }) => {
    const isProd = Bun.env.NODE_ENV === "production";

    if (error instanceof RedisLockError) {
      const message = isProd
        ? {
            title: "Locked resource",
            message: "The resource is currently locked. Please try again later",
            status: 409,
          }
        : { error: error };

      return status(409, message);
    }

    if (code === "VALIDATION") {
      const message = isProd
        ? { message: "Invalid request payload" }
        : { error: error };

      return status(422, message);
    }

    if (code === "NOT_FOUND") {
      return status(404, { message: "Not found :(" });
    }

    if (code === "INTERNAL_SERVER_ERROR") {
      console.error("Internal server error:", error);

      const message = isProd
        ? {
            title: "Internal server error",
            message: "An internal server error occurred",
            status: 500,
          }
        : { error: error };

      return status(500, message);
    }
  })
  .as("global");
