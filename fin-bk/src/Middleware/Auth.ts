import Elysia from "elysia";
import Redis from "../Config/Redis";
import UserModel from "../Model/UserModel";
import { JwtAccessToken } from "./Jwt";
import type { AuthUserStateTypes } from "../Types/UserTypes";

const Auth = new Elysia()
  .use(JwtAccessToken())
  .state("user", { id: "", email: "", iat: 0 } as AuthUserStateTypes)
  .onBeforeHandle(
    async ({
      set,
      store,
      cookie: { AccessToken, RefreshToken },
      JwtAccessToken,
    }) => {
      const access = AccessToken.value;
      const refresh = RefreshToken.value;

      if (!access) {
        set.status = 401;
        return { message: "Unauthorized: access token not found" };
      }

      try {
        const decoded = await JwtAccessToken.verify(access);
        if (!decoded) {
          set.status = 401;
          return { message: "Unauthorized: invalid access token" };
        }

        const [existingUser, RedisRefreshToken] = await Promise.all([
          UserModel.exists({ _id: decoded.id }),
          Redis.get(`RefreshToken:${decoded.id}`),
        ]);

        if (!existingUser) {
          set.status = 401;
          return { message: "Unauthorized" };
        }

        // Single session sign in check
        if (!RedisRefreshToken || refresh !== RedisRefreshToken) {
          set.status = 401;
          return { message: "Session invalid" };
        }

        store.user = {
          id: decoded.id,
          email: decoded.email,
          iat: decoded.iat,
        } as AuthUserStateTypes;
      } catch (error) {
        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
  )
  .resolve(({ store }) => {
    return { user: store.user };
  })
  .as("scoped");

export default Auth;
