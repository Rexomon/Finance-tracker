import { Elysia } from "elysia";
import { timingSafeEqual } from "node:crypto";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";
import { JwtAccessToken, JwtRefreshToken } from "../../Middleware/Jwt";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError, tryCatch } from "../../Utils/ErrorHandling";

import { loginUserService, registerUserService } from "./user-service";

import { UserLoginSchema, UserRegisterSchema } from "./user-types";

import { userByIdQuery } from "./user-db";

import type { TAuthUser } from "../../Types/types";

// Token expiry times in seconds
const ACCESS_TOKEN_EXPIRY = 60 * 30; // 30 minutes
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days

const REFRESH_TOKEN_PREFIX = "RefreshToken:";

const UserRoutes = new Elysia({
  strictPath: true,
  name: "UserApiV1",
  prefix: "/users",
  detail: { tags: ["User"] },
})
  .use(JwtAccessToken())
  .use(JwtRefreshToken())
  .use(RedisLock)

  // Login route by email and password
  .post(
    "/login",
    async ({
      set,
      status,
      JwtAccessToken,
      JwtRefreshToken,
      body: { email, password },
      cookie: { AccessToken, RefreshToken },
    }) => {
      const userLoginInput = { email, password };

      const userLoginResult = await loginUserService(userLoginInput);
      if (!userLoginResult.success) {
        return status(userLoginResult.error.code, {
          message: userLoginResult.error.message,
        });
      }

      const [userAccessToken, userRefreshToken] = await Promise.all([
        JwtAccessToken.sign({
          user: userLoginResult.data.user,
        }),

        JwtRefreshToken.sign({
          user: { id: userLoginResult.data.user.id },
        }),
      ]);

      AccessToken.set({
        value: userAccessToken,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        maxAge: ACCESS_TOKEN_EXPIRY,
        secrets: Bun.env.COOKIE_SECRET,
      });

      RefreshToken.set({
        value: userRefreshToken,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_EXPIRY,
        secrets: Bun.env.COOKIE_SECRET,
      });

      const cacheKey = `${REFRESH_TOKEN_PREFIX}${userLoginResult.data.user.id}`;

      await redis.set(cacheKey, userRefreshToken, "EX", REFRESH_TOKEN_EXPIRY);

      set.headers["content-type"] = "application/json";

      return status(userLoginResult.data.code, {
        message: userLoginResult.data.message,
      });
    },
    { body: UserLoginSchema },
  )

  // Register a new user
  .post(
    "/register",
    async ({ status, lock, body: { name, email, password } }) => {
      const userRegistrationInput = { name, email, password };
      const lockKey = `UserRegister:${email}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const registrationResult =
        await registerUserService(userRegistrationInput);
      if (!registrationResult.success) {
        return status(registrationResult.error.code, {
          message: registrationResult.error.message,
        });
      }

      return status(registrationResult.data.code, {
        message: registrationResult.data.message,
      });
    },
    { body: UserRegisterSchema },
  )

  // Refresh token
  .post(
    "/refresh",
    async ({
      set,
      status,
      lock,
      JwtAccessToken,
      JwtRefreshToken,
      cookie: { AccessToken, RefreshToken },
    }) => {
      const refreshToken = RefreshToken.value as string;
      if (!refreshToken) {
        return status(401, { message: "Unauthorized" });
      }

      const refreshTokenPayload = (await JwtRefreshToken.verify(
        refreshToken,
      )) as TAuthUser;
      if (!refreshTokenPayload) {
        return status(401, { message: "Unauthorized" });
      }

      const userId = refreshTokenPayload.user.id;
      const cacheKey = `RefreshToken:${userId}`;

      const lockResult = await tryCatch(() => lock.acquire(cacheKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const sessionResult = await tryCatch(async () => {
        const [redisRefreshToken, [user]] = await Promise.all([
          redis.get(cacheKey),
          userByIdQuery.execute({ userId }),
        ]);

        return { redisRefreshToken, user };
      });
      if (!sessionResult.success) {
        const { code, message } = handleError(sessionResult.error);
        return status(code, { message });
      }

      const { redisRefreshToken, user } = sessionResult.data;
      if (!redisRefreshToken) return status(401, { message: "Unauthorized" });
      if (!user) return status(401, { message: "Unauthorized" });

      const refreshTokenBuffer = Buffer.from(refreshToken);
      const redisRefreshTokenBuffer = Buffer.from(redisRefreshToken);
      if (
        refreshTokenBuffer.length !== redisRefreshTokenBuffer.length ||
        !timingSafeEqual(refreshTokenBuffer, redisRefreshTokenBuffer)
      ) {
        return status(401, { message: "Unauthorized" });
      }

      const [newAccessToken, newRefreshToken] = await Promise.all([
        JwtAccessToken.sign({
          user: user,
        }),

        JwtRefreshToken.sign({
          user: { id: user.id },
        }),
      ]);

      AccessToken.set({
        value: newAccessToken,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        maxAge: ACCESS_TOKEN_EXPIRY,
        secrets: Bun.env.COOKIE_SECRET,
      });

      RefreshToken.set({
        value: newRefreshToken,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_EXPIRY,
        secrets: Bun.env.COOKIE_SECRET,
      });

      await redis.set(cacheKey, newRefreshToken, "EX", REFRESH_TOKEN_EXPIRY);

      set.headers["content-type"] = "application/json";

      return status(200, { message: "Token refreshed successfully" });
    },
  )

  .use(Auth)
  // ==Authenticated routes==
  // Logout authenticated user
  .post(
    "/logout",
    async ({
      set,
      status,
      user: { id: userId },
      cookie: { AccessToken, RefreshToken },
    }) => {
      const cacheKey = `${REFRESH_TOKEN_PREFIX}${userId}`;
      await redis.del(cacheKey);

      AccessToken.remove();
      RefreshToken.remove();

      set.headers["content-type"] = "application/json";

      return status(200, { message: "Logout successful" });
    },
    { auth: true },
  )

  // Get authenticated user
  .get(
    "/profile",
    async ({ status, user }) => {
      return status(200, { user });
    },
    { auth: true },
  );

export default UserRoutes;
