import { timingSafeEqual } from "node:crypto";

import Redis from "../../Config/Redis";

import { handleError } from "../../Utils/ErrorHandling";
import { JwtAccessToken, JwtRefreshToken } from "../../Middleware/Jwt";

import {
  userLoginQuery,
  userCreateAccount,
  userQueryFindById,
  userRegisterQuery,
} from "./db";

import type { TUserId, TUserLogin, TUserRegister } from "./types";
import type { TAuthUser } from "../../Types/types";

const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days
const REFRESH_TOKEN_PREFIX = "RefreshToken:";

const jwtAccessToken = JwtAccessToken().decorator.JwtAccessToken;
const jwtRefreshToken = JwtRefreshToken().decorator.JwtRefreshToken;

export const userLogin = async ({ email, password }: TUserLogin) => {
  try {
    const user = await userLoginQuery({ email });
    if (!user) {
      return { code: 401, message: "Email or password is incorrect" };
    }

    const isPasswordMatch = await Bun.password.verify(password, user.password);
    if (!isPasswordMatch) {
      return { code: 401, message: "Email or password is incorrect" };
    }

    const userObjectId = user._id.toString();

    const [userAccessToken, userRefreshToken] = await Promise.all([
      jwtAccessToken.sign({
        id: userObjectId,
        email: user.email,
      }),

      jwtRefreshToken.sign({
        id: userObjectId,
      }),
    ]);

    const cacheKey = `${REFRESH_TOKEN_PREFIX}${userObjectId}`;

    await Redis.set(cacheKey, userRefreshToken, "EX", REFRESH_TOKEN_EXPIRY);

    return {
      code: 200,
      message: "Login successful",
      userAccessToken,
      userRefreshToken,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const userRegister = async ({
  name,
  email,
  password,
}: TUserRegister) => {
  try {
    const existingUser = await userRegisterQuery({ name, email });
    if (existingUser) {
      const message =
        existingUser.name === name
          ? "User already exists"
          : "Email already exists";

      return { code: 409, message };
    }

    const hashPassword = await Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 21000,
      timeCost: 2,
    });

    const newUser = {
      name: name.trim(),
      email: email.trim(),
      password: hashPassword,
    };

    await userCreateAccount(newUser);

    return { code: 201, message: "User registered successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const userRefresh = async (
  { userId }: TUserId,
  cacheKey: string,
  refresh: string,
) => {
  try {
    const [redisRefreshToken, user] = await Promise.all([
      Redis.get(cacheKey),
      userQueryFindById({ userId }),
    ]);
    if (!redisRefreshToken) {
      return { code: 401, message: "Session invalid" };
    }

    const refreshBuffer = Buffer.from(refresh);
    const redisRefreshBuffer = Buffer.from(redisRefreshToken);

    if (
      refreshBuffer.length !== redisRefreshBuffer.length ||
      !timingSafeEqual(refreshBuffer, redisRefreshBuffer)
    ) {
      return { code: 401, message: "Session invalid" };
    }
    if (!user) {
      return { code: 401, message: "Unauthorized" };
    }

    const userObjectId = user._id.toString();

    const [newAccessToken, newRefreshToken] = await Promise.all([
      jwtAccessToken.sign({
        id: userObjectId,
        email: user.email,
      }),

      jwtRefreshToken.sign({
        id: userObjectId,
      }),
    ]);

    await Redis.set(cacheKey, newRefreshToken, "EX", REFRESH_TOKEN_EXPIRY);

    return {
      code: 200,
      message: "Token refreshed successfully",
      newAccessToken,
      newRefreshToken,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const userLogout = async ({ userId }: TUserId) => {
  try {
    const cacheKey = `${REFRESH_TOKEN_PREFIX}${userId}`;
    await Redis.del(cacheKey);

    return { code: 200, message: "Logout successful" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const userProfile = async (user: TAuthUser) => {
  try {
    return { code: 200, user };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
