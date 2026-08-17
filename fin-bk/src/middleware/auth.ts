import { Elysia } from "elysia";

import { redis } from "../config/redis";

import { JwtAccessToken } from "./jwt";
import { handleError, tryCatch } from "../utils/error-handler";

import { userByIdQuery } from "../modules/user/user-db";

import type { TAuthUser } from "../types/types";

const Auth = new Elysia({ name: "Auth" }).use(JwtAccessToken()).macro({
  auth: {
    async resolve({
      status,
      JwtAccessToken,
      cookie: { AccessToken, RefreshToken },
    }) {
      const accessToken = AccessToken.value as string;
      const refreshToken = RefreshToken.value as string;

      if (!accessToken || !refreshToken)
        return status(401, { message: "Unauthorized" });

      const tokenPayload = (await JwtAccessToken.verify(
        accessToken,
      )) as TAuthUser;
      if (!tokenPayload) return status(401, { message: "Unauthorized" });

      const userId = tokenPayload.user.id;

      const sessionResult = await tryCatch(async () => {
        const [redisRefreshToken, [existingUser]] = await Promise.all([
          redis.get(`RefreshToken:${userId}`),
          userByIdQuery.execute({ userId }),
        ]);

        return { redisRefreshToken, existingUser };
      });
      if (!sessionResult.success) {
        const { code, message } = handleError(sessionResult.error);
        return status(code, { message });
      }

      // Single session sign in check
      const { redisRefreshToken, existingUser } = sessionResult.data;
      if (!redisRefreshToken || refreshToken !== redisRefreshToken)
        return status(401, { message: "Unauthorized" });
      if (!existingUser) return status(401, { message: "Unauthorized" });

      return {
        user: tokenPayload.user,
      };
    },
  },
});

export default Auth;
