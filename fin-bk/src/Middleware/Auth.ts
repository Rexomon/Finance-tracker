import Elysia from "elysia";

import Redis from "../Config/Redis";

import { JwtAccessToken } from "./Jwt";
import { userQueryExists } from "../Modules/User/db";

import type { TAuthUser } from "../Types/types";

const Auth = new Elysia()
  .use(JwtAccessToken())
  .state("user", { id: "", email: "", iat: 0 } as TAuthUser)
  .onBeforeHandle(
    async ({
      status,
      store,
      cookie: { AccessToken, RefreshToken },
      JwtAccessToken,
    }) => {
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

        store.user = {
          id: userId,
          email: email,
          iat: iat,
        } as TAuthUser;
      } catch (error) {
        console.error(error);
        return status(500, { message: "An internal server error occurred" });
      }
    },
  )
  .resolve(({ store }) => {
    return { user: store.user };
  })
  .as("scoped");

export default Auth;
