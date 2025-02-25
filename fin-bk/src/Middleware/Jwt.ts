import jwt from "@elysiajs/jwt";

const passKeySecret: string = Bun.env.JWT_SECRET_KEY as string;

export function JwtAccessToken() {
	return jwt({
		name: "JwtAccessToken",
		secret: passKeySecret,
	});
}

export function JwtRefreshToken() {
	return jwt({
		name: "JwtRefreshToken",
		secret: passKeySecret,
	});
}
