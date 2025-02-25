import { Elysia } from "elysia";
import redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import { JwtAccessToken, JwtRefreshToken } from "../Middleware/Jwt";
import UserModel from "../Model/UserModel";
import { UserLoginTypes, UserRegisterTypes } from "../Types/UserTypes";
import Headers from "../Middleware/Headers";


const UserRoutes = new Elysia({ prefix: "/users" })
	.use(Headers)
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
					set.status = 400;
					return { message: "Email or password is incorrect" };
				}

				const isPasswordMatch = await Bun.password.verify(
					password,
					user.password,
				);
				if (!isPasswordMatch) {
					set.status = 400;
					return { message: "Email or password is incorrect" };
				}

				const currentTime = Math.floor(Date.now() / 1000);

				const SessionAccessToken = await JwtAccessToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
					exp: currentTime + 60 * 30, // 30 minutes
				});

				AccessToken.set({
					value: SessionAccessToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: 60 * 30,
					secrets: Bun.env.COOKIE_SECRET,
				});

				const SessionRefreshToken = await JwtRefreshToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
					exp: currentTime + 60 * 60 * 24 * 7, // 7 days
				});

				RefreshToken.set({
					value: SessionRefreshToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: 60 * 60 * 24 * 7,
					secrets: Bun.env.COOKIE_SECRET,
				});

				await redis.set(
					`RefreshToken:${user.id}`,
					SessionRefreshToken,
					"EX",
					60 * 60 * 24 * 7,
				);

				set.status = 200;
				return { message: "Login success" };
			} catch (error) {
				set.status = 500;
				console.error(error);
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
			}
		},
		{
			body: UserRegisterTypes,
		},
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
				const decoded = await JwtRefreshToken.verify(RefreshToken.value);
				if (!decoded) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const RedisRefreshToken = await redis.get(`RefreshToken:${decoded.id}`);
				if (RefreshToken.value !== RedisRefreshToken) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const user = await UserModel.findOne({ _id: decoded.id });
				if (!user) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const currentTime = Math.floor(Date.now() / 1000);

				const SessionAccessToken = await JwtAccessToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
					exp: currentTime + 60 * 30, // 30 minutes
				});

				AccessToken.set({
					value: SessionAccessToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: 60 * 30,
					secrets: Bun.env.COOKIE_SECRET,
				});

				const SessionRefreshToken = await JwtRefreshToken.sign({
					id: user.id,
					email: user.email,
					iat: currentTime,
					exp: currentTime + 60 * 60 * 24 * 7, // 7 days
				});

				RefreshToken.set({
					value: SessionRefreshToken,
					secure: true,
					httpOnly: true,
					sameSite: "lax",
					maxAge: 60 * 60 * 24 * 7,
					secrets: Bun.env.COOKIE_SECRET,
				});

				await redis.set(
					`RefreshToken:${user.id}`,
					SessionRefreshToken,
					"EX",
					60 * 60 * 24 * 7,
				);

				set.status = 200;
				return { message: "Refresh token success" };
			} catch (error) {
				set.status = 500;
				console.error(error);
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

			await redis.del(`RefreshToken:${user.id}`);

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
