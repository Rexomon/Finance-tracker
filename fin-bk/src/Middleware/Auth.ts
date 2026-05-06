import { Elysia } from "elysia";

import Redis from "../Config/Redis";

import { JwtAccessToken } from "./Jwt";
import { userQueryExists } from "../Modules/User/db";

const Auth = new Elysia({ name: "Auth" }).use(JwtAccessToken()).macro({
  auth: {
    async resolve({
      status,
      cookie: { AccessToken, RefreshToken },
      JwtAccessToken,
    }) {
      const access = AccessToken.value as string;
      const refresh = RefreshToken.value as string;

      if (!access) {
        return status(401, { message: "Unauthorized: access token not found" });
      }

      if (!refresh) {
        return status(401, {
          message: "Unauthorized: refresh token not found",
        });
      }

      try {
        const decoded = await JwtAccessToken.verify(access);
        if (!decoded) {
          return status(401, { message: "Unauthorized: invalid token" });
        }

        const { id: userId, email, iat } = decoded;

        if (!userId || typeof userId !== "string" || !email || !iat) {
          return status(401, { message: "Unauthorized: invalid token" });
        }

        const [existingUser, redisRefreshToken] = await Promise.all([
          userQueryExists({ userId }),
          Redis.get(`RefreshToken:${userId}`),
        ]);
        if (!existingUser) {
          return status(401, { message: "Unauthorized" });
        }

        // Single session sign in check
        if (!redisRefreshToken || refresh !== redisRefreshToken) {
          return status(401, { message: "Session invalid" });
        }

        return {
          user: {
            id: userId,
            email: email,
            iat: iat,
          },
        };
      } catch (error) {
        console.error(error);
        return status(500, { message: "An internal server error occurred" });
      }
    },
  },
});

export default Auth;
