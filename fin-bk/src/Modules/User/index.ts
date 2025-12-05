import { Elysia } from "elysia";

import Auth from "../../Middleware/Auth";
import { JwtRefreshToken } from "../../Middleware/Jwt";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import {
  userLogin,
  userRegister,
  userRefresh,
  userLogout,
  userProfile,
} from "./service";

import { UserLoginSchema, UserRegisterSchema } from "./types";

// Token expiry times in seconds
const ACCESS_TOKEN_EXPIRY = 60 * 30; // 30 minutes
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days

const UserRoutes = new Elysia({
  strictPath: true,
  name: "UserApiV1",
  prefix: "/users",
  detail: { tags: ["User"] },
})
  .use(JwtRefreshToken())
  .use(RedisLock)

  // Login route by email and password
  .post(
    "/login",
    async ({ status, set, body, cookie: { AccessToken, RefreshToken } }) => {
      try {
        const { email, password } = body;

        const userResponse = await userLogin({ email, password });
        if (userResponse.code !== 200) {
          return status(userResponse.code, { message: userResponse.message });
        }

        const jwtAccessToken = userResponse.userAccessToken;
        const jwtRefreshToken = userResponse.userRefreshToken;

        AccessToken.set({
          value: jwtAccessToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: ACCESS_TOKEN_EXPIRY,
          secrets: Bun.env.COOKIE_SECRET,
        });

        RefreshToken.set({
          value: jwtRefreshToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: REFRESH_TOKEN_EXPIRY,
          secrets: Bun.env.COOKIE_SECRET,
        });

        set.headers["content-type"] = "application/json";

        return status(userResponse.code, {
          message: userResponse.message,
        });
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
    async ({ status, body, lock }) => {
      try {
        const { name, email, password } = body;

        const lockKey = `UserRegister:${email}`;
        await lock.acquire(lockKey);

        const userResponse = await userRegister({ name, email, password });

        return status(userResponse.code, {
          message: userResponse.message,
        });
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

        const decoded = await JwtRefreshToken.verify(refresh);
        if (!decoded) {
          return status(401, {
            message: "Unauthorized: Invalid refresh token",
          });
        }

        const cacheKey = `RefreshToken:${decoded.id}`;
        await lock.acquire(cacheKey);

        const userResponse = await userRefresh(
          { userId: decoded.id as string },
          cacheKey,
          refresh,
        );
        if (userResponse.code !== 200) {
          return status(userResponse.code, { message: userResponse.message });
        }

        const jwtAccessToken = userResponse.newAccessToken;
        const jwtRefreshToken = userResponse.newRefreshToken;

        AccessToken.set({
          value: jwtAccessToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: ACCESS_TOKEN_EXPIRY,
          secrets: Bun.env.COOKIE_SECRET,
        });

        RefreshToken.set({
          value: jwtRefreshToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: REFRESH_TOKEN_EXPIRY,
          secrets: Bun.env.COOKIE_SECRET,
        });

        set.headers["content-type"] = "application/json";

        return status(userResponse.code, {
          message: userResponse.message,
        });
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
    async ({ status, set, user, cookie: { AccessToken, RefreshToken } }) => {
      try {
        const userResponse = await userLogout({ userId: user.id });

        AccessToken.remove();
        RefreshToken.remove();

        set.headers["content-type"] = "application/json";

        return status(userResponse.code, {
          message: userResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
  )

  // Get authenticated user
  .get("/profile", async ({ status, user }) => {
    try {
      const userResponse = await userProfile(user);

      return status(userResponse.code, { user: userResponse.user });
    } catch (error) {
      const { code, message } = handleError(error);

      return status(code, { message });
    }
  });

export default UserRoutes;
