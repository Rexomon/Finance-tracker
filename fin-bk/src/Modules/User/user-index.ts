import { Elysia } from "elysia";
import { timingSafeEqual } from "node:crypto";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";
import { JwtAccessToken, JwtRefreshToken } from "../../Middleware/Jwt";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import { userLoginService, userRegisterService } from "./user-service";

import { UserLoginSchema, UserRegisterSchema } from "./user-types";

import { getUserById } from "./user-db";

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
      const filter = { email, password };

      try {
        const userResponse = await userLoginService(filter);
        if (userResponse.code !== 200) {
          return status(userResponse.code, { message: userResponse.message });
        }

        const [userAccessToken, userRefreshToken] = await Promise.all([
          JwtAccessToken.sign({
            user: userResponse.user,
          }),

          JwtRefreshToken.sign({
            user: { id: userResponse.user.id },
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

        const cacheKey = `${REFRESH_TOKEN_PREFIX}${userResponse.user.id}`;

        await redis.set(cacheKey, userRefreshToken, "EX", REFRESH_TOKEN_EXPIRY);

        set.headers["content-type"] = "application/json";

        return status(userResponse.code, { message: userResponse.message });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: UserLoginSchema },
  )

  // Register a new user
  .post(
    "/register",
    async ({ status, lock, body: { name, email, password } }) => {
      const data = { name, email, password };

      try {
        const lockKey = `UserRegister:${email}`;
        await lock.acquire(lockKey);

        const userResponse = await userRegisterService(data);

        return status(userResponse.code, { message: userResponse.message });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: UserRegisterSchema },
  )

  // Refresh token
  .post(
    "/refresh",
    async ({
      status,
      set,
      lock,
      JwtAccessToken,
      JwtRefreshToken,
      cookie: { AccessToken, RefreshToken },
    }) => {
      try {
        const refresh = RefreshToken.value as string;
        if (!refresh) {
          return status(401, {
            message: "Unauthorized: Invalid refresh token",
          });
        }

        const decoded = (await JwtRefreshToken.verify(refresh)) as TAuthUser;
        if (!decoded) {
          return status(401, {
            message: "Unauthorized: Invalid refresh token",
          });
        }

        const userId = decoded.user.id;

        const cacheKey = `RefreshToken:${userId}`;
        await lock.acquire(cacheKey);

        const [redisRefreshToken, [user]] = await Promise.all([
          redis.get(cacheKey),
          getUserById.execute({ userId }),
        ]);
        if (!redisRefreshToken) {
          return status(401, { message: "Session invalid" });
        } else if (!user) {
          return status(401, { message: "Unauthorized" });
        }

        const refreshBuffer = Buffer.from(refresh);
        const redisRefreshBuffer = Buffer.from(redisRefreshToken);
        if (
          refreshBuffer.length !== redisRefreshBuffer.length ||
          !timingSafeEqual(refreshBuffer, redisRefreshBuffer)
        ) {
          return status(401, { message: "Session invalid" });
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
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
  )

  .use(Auth)
  // ==Authenticated routes==
  // Logout authenticated user
  .post(
    "/logout",
    async ({
      status,
      set,
      user: { id },
      cookie: { AccessToken, RefreshToken },
    }) => {
      const userId = id;

      try {
        const cacheKey = `${REFRESH_TOKEN_PREFIX}${userId}`;
        await redis.del(cacheKey);

        AccessToken.remove();
        RefreshToken.remove();

        set.headers["content-type"] = "application/json";

        return status(200, { message: "Logout successful" });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { auth: true },
  )

  // Get authenticated user
  .get(
    "/profile",
    async ({ status, user }) => {
      try {
        return status(200, { user });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { auth: true },
  );

export default UserRoutes;
