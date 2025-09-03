import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import UserModel from "../Model/UserModel";
import { RedisLock } from "../Utils/RedisLocking";
import { JwtAccessToken, JwtRefreshToken } from "../Middleware/Jwt";
import { UserLoginTypes, UserRegisterTypes } from "../Types/UserTypes";

const UserRoutes = new Elysia({ prefix: "/users", detail: { tags: ["User"] } })
  .use(JwtAccessToken())
  .use(JwtRefreshToken())
  .use(RedisLock)
  // Login route by email and password
  .post(
    "/login",
    async ({
      set,
      body,
      cookie: { AccessToken, RefreshToken },
      JwtAccessToken,
      JwtRefreshToken,
    }) => {
      try {
        const { email, password } = body;

        const user = await UserModel.findOne({ email: email }).select("+password");
        if (!user) {
          set.status = 401;
          return { message: "Email or password is incorrect" };
        }

        const isPasswordMatch = await Bun.password.verify(
          password,
          user.password,
        );
        if (!isPasswordMatch) {
          set.status = 401;
          return { message: "Email or password is incorrect" };
        }

        const accessTokenExpiry = 60 * 30; // 30 minutes in seconds
        const refreshTokenExpiry = 60 * 60 * 24 * 7; // 7 days in seconds

        const [UserAccessToken, UserRefreshToken] = await Promise.all([
          JwtAccessToken.sign({
            id: user.id,
            email: user.email,
          }),

          JwtRefreshToken.sign({
            id: user.id,
          }),
        ]);

        AccessToken.set({
          value: UserAccessToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: accessTokenExpiry,
          secrets: Bun.env.COOKIE_SECRET,
        });

        RefreshToken.set({
          value: UserRefreshToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: refreshTokenExpiry,
          secrets: Bun.env.COOKIE_SECRET,
        });

        await Redis.set(
          `RefreshToken:${user.id}`,
          UserRefreshToken,
          "EX",
          refreshTokenExpiry,
        );

        set.status = 200;
        return { message: "Login success" };
      } catch (error) {
        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
    { body: UserLoginTypes },
  )

  // Register a new user
  .post(
    "/register",
    async ({ set, body, lock }) => {
      try {
        const { name, email, password } = body;

        const lockKey = `UserRegister:${email}`;

        await lock.acquire(lockKey);

        const existingUser = await UserModel.findOne({
          $or: [{ name: name }, { email: email }],
        });
        if (existingUser) {
          if (existingUser.name === name) {
            set.status = 409;
            return { message: "Name already exists" };
          }
          if (existingUser.email === email) {
            set.status = 409;
            return { message: "Email already exists" };
          }
        }

        const hashPassword = await Bun.password.hash(password, {
          algorithm: "argon2id",
          memoryCost: 21000,
          timeCost: 2,
        });

        const newUser = {
          name: name,
          email: email,
          password: hashPassword,
        };

        await UserModel.create(newUser);

        set.status = 201;
        return {
          message: "User created",
          user: { name: newUser.name, email: newUser.email },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          set.status = 429;
          return {
            message: "Too many requests, please wait a moment and try again",
          };
        }

        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
    { body: UserRegisterTypes },
  )

  // Refresh token route for authenticated users
  .post(
    "/refresh",
    async ({
      set,
      lock,
      cookie: { AccessToken, RefreshToken },
      JwtAccessToken,
      JwtRefreshToken,
    }) => {
      if (!RefreshToken.value) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      const decodedToken = await JwtRefreshToken.verify(RefreshToken.value);
      if (!decodedToken) {
        set.status = 401;
        return { message: "Unauthorized" };
      }

      try {
        const cacheKey = `RefreshToken:${decodedToken.id}`;

        await lock.acquire(cacheKey);

        const [RedisRefreshToken, user] = await Promise.all([
          Redis.get(cacheKey),
          UserModel.findOne({ _id: decodedToken.id }),
        ]);

        if (RefreshToken.value !== RedisRefreshToken) {
          set.status = 401;
          return { message: "Unauthorized" };
        }

        if (!user) {
          set.status = 404;
          return { message: "User does not exist" };
        }

        const accessTokenExpiry = 60 * 30; // 30 minutes in seconds
        const refreshTokenExpiry = 60 * 60 * 24 * 7; // 7 days in seconds

        const [UserAccessToken, UserRefreshToken] = await Promise.all([
          JwtAccessToken.sign({
            id: user.id,
            email: user.email,
          }),

          JwtRefreshToken.sign({
            id: user.id,
          }),
        ]);

        AccessToken.set({
          value: UserAccessToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: accessTokenExpiry,
          secrets: Bun.env.COOKIE_SECRET,
        });

        RefreshToken.set({
          value: UserRefreshToken,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: refreshTokenExpiry,
          secrets: Bun.env.COOKIE_SECRET,
        });

        await Redis.set(cacheKey, UserRefreshToken, "EX", refreshTokenExpiry);

        set.status = 200;
        return { message: "Refresh token success" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          set.status = 429;
          return {
            message: "Too many requests, please wait a moment and try again",
          };
        }

        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
  )

  .use(Auth)
  // ==Authenticated routes==
  // Logout authenticated user
  .post(
    "/logout",
    async ({ set, user, cookie: { AccessToken, RefreshToken } }) => {
      AccessToken.remove();
      RefreshToken.remove();

      await Redis.del(`RefreshToken:${user.id}`);

      set.status = 200;
      return { message: "Logout success" };
    },
  )

  // Get authenticated user
  .get("/profile", async ({ set, user }) => {
    set.status = 200;
    return { user };
  });

export default UserRoutes;
