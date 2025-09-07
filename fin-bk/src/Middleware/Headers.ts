import { Elysia } from "elysia";

const Headers = new Elysia().onRequest(({ set }) => {
  set.headers = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'self'",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  };
});

export default Headers;
