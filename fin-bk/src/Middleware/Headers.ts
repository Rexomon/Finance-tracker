import { Elysia } from "elysia";

const Headers = new Elysia().onRequest(({ set }) => {
  set.headers["x-content-type-options"] = "nosniff";
  set.headers["referrer-policy"] = "strict-origin-when-cross-origin";
  set.headers["strict-transport-security"] =
    "max-age=31536000; includeSubDomains; preload";
  set.headers["content-security-policy"] =
    "default-src 'none'; frame-ancestors 'none'; script-src 'none'";
});

export default Headers;
