import jwt from "@elysiajs/jwt";

export function JwtAccessToken(secret = Bun.env.JWT_ACCESS_TOKEN_SECRET) {
  if (!secret) {
    throw new Error("JWT_ACCESS_TOKEN_SECRET environment variable is not set");
  }
  return jwt({
    name: "JwtAccessToken",
    secret: secret,
    exp: "30m",
  });
}

export function JwtRefreshToken(secret = Bun.env.JWT_REFRESH_TOKEN_SECRET) {
  if (!secret) {
    throw new Error("JWT_REFRESH_TOKEN_SECRET environment variable is not set");
  }
  return jwt({
    name: "JwtRefreshToken",
    secret: secret,
    exp: "7d",
  });
}
