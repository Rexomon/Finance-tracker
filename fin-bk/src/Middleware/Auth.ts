import type Elysia from "elysia";
import redis from "../Config/Redis";
import UserModel from "../Model/UserModel";
import { JwtAccessToken } from "./Jwt";

const Auth = (app: Elysia) =>
	app
		.use(JwtAccessToken())
		.derive(
			async ({
				set,
				cookie: { AccessToken, RefreshToken },
				JwtAccessToken,
			}) => {
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

					const isUserExist = await UserModel.findOne({ _id: decoded.id });
					if (!isUserExist) {
						set.status = 401;
						return { message: "Unauthorized" };
					}

					const RedisAccessToken = await redis.get(
						`RefreshToken:${decoded.id}`,
					);
					if (RefreshToken.value !== RedisAccessToken) {
						set.status = 401;
						return { message: "Unauthorized" };
					}

					const user = decoded;

					return { user };
				} catch (error) {
					set.status = 500;
					console.error(error);
				}
			},
		);

export default Auth;
