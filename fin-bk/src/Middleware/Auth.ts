import Elysia from "elysia";
import Redis from "../Config/Redis";
import UserModel from "../Model/UserModel";
import { JwtAccessToken } from "./Jwt";

const Auth = new Elysia()
	.use(JwtAccessToken())
	.derive(
		async ({ set, cookie: { AccessToken, RefreshToken }, JwtAccessToken }) => {
			if (!AccessToken.value) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const decoded = await JwtAccessToken.verify(AccessToken.value);
				if (!decoded) {
					set.status = 401;
					return { message: "Unauthorized" };
				}

				const [existingUser, RedisRefreshToken] = await Promise.all([
					UserModel.exists({ _id: decoded.id }),
					Redis.get(`RefreshToken:${decoded.id}`),
				]);

				if (!existingUser) {
					set.status = 404;
					return { message: "User not found" };
				}

				// Single session sign in check
				if (!RedisRefreshToken) {
					set.status = 401;
					return { message: "Session expired" };
				}
				if (RefreshToken.value !== RedisRefreshToken) {
					set.status = 401;
					return { message: "Session invalid" };
				}

				const user = decoded;

				return { user };
			} catch (error) {
				set.status = 500;
				console.error(error);
			}
		},
	)
	.as("scoped");

export default Auth;
