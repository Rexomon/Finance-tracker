import { Elysia } from "elysia";

import { redis } from "../Config/Redis";

import { JwtAccessToken } from "./Jwt";
import { handleError } from "../Utils/ErrorHandling";

import { getUserById } from "../Modules/User/user-db";

import type { TAuthUser } from "../Types/types";

const Auth = new Elysia({ name: "Auth" }).use(JwtAccessToken()).macro({
  auth: {
    async resolve({
      status,
      JwtAccessToken,
      cookie: { AccessToken, RefreshToken },
    }) {
      const access = AccessToken.value as string;
      const refresh = RefreshToken.value as string;

      if (!access) {
        return status(401, { message: "Unauthorized: access token not found" });
      } else if (!refresh) {
        return status(401, {
          message: "Unauthorized: refresh token not found",
        });
      }

      try {
        const decoded = (await JwtAccessToken.verify(access)) as TAuthUser;
        if (!decoded) {
          return status(401, { message: "Unauthorized: invalid token" });
        }

        const userId = decoded.user.id;

        const [redisRefreshToken, [existingUser]] = await Promise.all([
          redis.get(`RefreshToken:${userId}`),
          getUserById.execute({ userId }),
        ]);
        // Single session sign in check
        if (!redisRefreshToken || refresh !== redisRefreshToken) {
          return status(401, { message: "Session invalid" });
        } else if (!existingUser) {
          return status(401, { message: "Unauthorized" });
        }

        return {
          user: decoded.user,
        };
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
  },
});

export default Auth;
