import jwt from "@elysiajs/jwt";

const accessTokenSecret: string = Bun.env.JWT_ACCESS_TOKEN_SECRET as string;
const refreshTokenSecret: string = Bun.env.JWT_REFRESH_TOKEN_SECRET as string;

if (!accessTokenSecret) {
	console.error("JWT_ACCESS_TOKEN_SECRET environment variable is not set");
	process.exit(1);
}

if (!refreshTokenSecret) {
	console.error("JWT_REFRESH_TOKEN_SECRET environment variable is not set");
	process.exit(1);
}

export function JwtAccessToken() {
	return jwt({
		name: "JwtAccessToken",
		secret: accessTokenSecret,
		exp: "30m",
	});
}

export function JwtRefreshToken() {
	return jwt({
		name: "JwtRefreshToken",
		secret: refreshTokenSecret,
		exp: "7d",
	});
}
