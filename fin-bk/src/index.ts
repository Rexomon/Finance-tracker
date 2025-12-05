import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";

import Headers from "./Middleware/Headers";

import { apiRoutesV1 } from "./routes";
import { getRealIp } from "./Utils/RealIp";
import { safelyCloseRedis } from "./Config/Redis";

import {
  connectToDatabase,
  safelyCloseMongoDB,
} from "./Database/DatabaseConnection";

await connectToDatabase();

const port = Number(Bun.env.PORT);
const nodeEnv = Bun.env.NODE_ENV;
const corsDomainOrigin = Bun.env.DOMAIN_ORIGIN;

if (nodeEnv === "production" && !corsDomainOrigin) {
  throw new Error("CORS domain origin is not set");
}

// Elysia server initialization and configuration
const config = new Elysia({ name: "elysia-config" })
  .onError(({ error, code, status }) => {
    const isProd = nodeEnv === "production";

    if (code === "VALIDATION") {
      const message = isProd
        ? { message: "Invalid request payload" }
        : { error: error };

      return status(400, message);
    }

    if (code === "NOT_FOUND") {
      return status(404, { message: "Not found :(" });
    }

    if (code === "INTERNAL_SERVER_ERROR") {
      const message = isProd
        ? { message: "An internal server error occurred" }
        : { error: error };

      return status(500, message);
    }

    if (isProd) console.error("Internal server error:", error);
  })
  .use(
    cors({
      origin: corsDomainOrigin || "*",
      credentials: Boolean(corsDomainOrigin),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      preflight: true,
      maxAge: 86400,
    }),
  )
  .use(
    rateLimit({
      duration: 15000,
      max: 10,
      generator: getRealIp,
      errorResponse: Response.json(
        {
          message: "Too many requests, please wait a moment and try again",
        },
        {
          status: 429,
        },
      ),
    }),
  )
  .all("*", ({ status }) => {
    return status(404, { message: "Not found :(" });
  });

if (nodeEnv === "production") {
  config.use(Headers);
} else {
  config.use(
    swagger({
      documentation: {
        info: {
          title: "Finance Tracker API - Elysia JS",
          description: "API for managing personal finances",
          version: "1.0.0",
        },
        tags: [
          { name: "User", description: "User related endpoints" },
          { name: "Transaction", description: "Transaction related endpoints" },
          { name: "Budget", description: "Budget related endpoints" },
          { name: "Category", description: "Category related endpoints" },
        ],
      },
      path: "/swagger",
    }),
  );
}

// Server setup
const app = new Elysia().use(config).use(apiRoutesV1).listen(port);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);

// Safely shutdown the server and close connections
let isShuttingDown = false;

const shutdownService = async (signal: string) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await Promise.all([safelyCloseRedis(), safelyCloseMongoDB(), app.stop()]);
    console.log("Elysia server stopped safely");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

const closeSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
for (const signalType of closeSignals) {
  process.on(signalType, () => {
    void shutdownService(signalType);
  });
}
