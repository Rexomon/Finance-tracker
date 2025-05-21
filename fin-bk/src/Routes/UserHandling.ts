import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import UserModel from "../Model/UserModel";
import { JwtAccessToken, JwtRefreshToken } from "../Middleware/Jwt";
import { UserLoginTypes, UserRegisterTypes } from "../Types/UserTypes";

const UserRoutes = new Elysia({ prefix: "/users", detail: { tags: ["User"] } })
	.use(JwtAccessToken())
	.use(JwtRefreshToken())
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

				const user = await UserModel.findOne({ email: email });
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

				const currentTime = Math.floor(Date.now() / 1000);
				const accessTokenExpiry = 60 * 30; // 30 minutes in seconds
				const refreshTokenExpiry = 60 * 60 * 24 * 7; // 7 days in seconds

				const UserAccessToken = await JwtAccessToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
				});

				AccessToken.set({
					value: UserAccessToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: accessTokenExpiry,
					secrets: Bun.env.COOKIE_SECRET,
				});

				const UserRefreshToken = await JwtRefreshToken.sign({
					id: user.id,
					iat: currentTime,
				});

				RefreshToken.set({
					value: UserRefreshToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: refreshTokenExpiry,
					secrets: Bun.env.COOKIE_SECRET,
				});

				await Redis.setex(
					`RefreshToken:${user.id}`,
					refreshTokenExpiry,
					UserRefreshToken,
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
	.post(
		"/register",
		async ({ set, body }) => {
			try {
				const { name, email, password } = body;

				const NameRegex = /^[a-zA-Z0-9]+$/;
				if (!name.match(NameRegex)) {
					set.status = 400;
					return { message: "Name can only contain letters and numbers" };
				}

				const isNameExist = await UserModel.findOne({ name: name });
				if (isNameExist) {
					set.status = 400;
					return { message: "Name already exists" };
				}

				const isEmailExist = await UserModel.findOne({ email: email });
				if (isEmailExist) {
					set.status = 400;
					return { message: "Email already exists" };
				}

				const hashPassword = await Bun.password.hash(password);

				const newUser = await UserModel.create({
					name: name,
					email: email,
					password: hashPassword,
				});

				set.status = 201;
				return {
					message: "User created",
					user: { name: newUser.name, email: newUser.email },
				};
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: UserRegisterTypes },
	)
	.post(
		"/refresh",
		async ({
			set,
			cookie: { AccessToken, RefreshToken },
			JwtAccessToken,
			JwtRefreshToken,
		}) => {
			if (!RefreshToken.value) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const decodedToken = await JwtRefreshToken.verify(RefreshToken.value);
				if (!decodedToken) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const RedisRefreshToken = await Redis.get(
					`RefreshToken:${decodedToken.id}`,
				);
				if (RefreshToken.value !== RedisRefreshToken) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const user = await UserModel.findOne({ _id: decodedToken.id });
				if (!user) {
					set.status = 404;
					return { message: "User does not exist" };
				}

				const currentTime = Math.floor(Date.now() / 1000);
				const accessTokenExpiry = 60 * 30; // 30 minutes in seconds
				const refreshTokenExpiry = 60 * 60 * 24 * 7; // 7 days in seconds

				const UserAccessToken = await JwtAccessToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
				});

				AccessToken.set({
					value: UserAccessToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: accessTokenExpiry,
					secrets: Bun.env.COOKIE_SECRET,
				});

				const UserRefreshToken = await JwtRefreshToken.sign({
					id: user.id,
					iat: currentTime,
				});

				RefreshToken.set({
					value: UserRefreshToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: refreshTokenExpiry,
					secrets: Bun.env.COOKIE_SECRET,
				});

				await Redis.setex(
					`RefreshToken:${user.id}`,
					refreshTokenExpiry,
					UserRefreshToken,
				);

				set.status = 200;
				return { message: "Refresh token success" };
			} catch (error) {
				set.status = 500;
				console.error(error);
        return { message: "An internal server error occurred" };
			}
		},
	)
	.use(Auth)
	.post(
		"/logout",
		async ({ set, user, cookie: { AccessToken, RefreshToken } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			AccessToken.remove();
			RefreshToken.remove();

			await Redis.del(`RefreshToken:${user.id}`);

			set.status = 200;
			return { message: "Logout success" };
		},
	)
	.get("/profile", async ({ set, user }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		return { user };
	});

export default UserRoutes;
