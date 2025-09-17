import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import Headers from "./Middleware/Headers";
import UserRoutes from "./Routes/UserHandling";
import BudgetRoutes from "./Routes/BudgetHandling";
import CategoryRoutes from "./Routes/CategoryHandling";
import TransactionRoutes from "./Routes/TransactionHandling";
import { rateLimit } from "elysia-rate-limit";
import { safelyCloseRedis } from "./Config/Redis";
import {
  connectToDatabase,
  safelyCloseMongoDB,
} from "./Database/DatabaseConnection";
import type { Server } from "bun";

await connectToDatabase();

// Ensure environment variables are set
const port = Number(Bun.env.PORT);
const nodeEnv = Bun.env.NODE_ENV;
const corsDomainOrigin = Bun.env.DOMAIN_ORIGIN;

if (nodeEnv === "production" && !corsDomainOrigin) {
  console.error("CORS domain origin is not set");
  process.exit(1);
}

// Function to get the real IP address of the client
// This function checks for common headers set by proxies/CDNs (e.g., Cloudflare, Nginx)
// and used as a generator for elysia rate limit middleware
const getRealIp = (request: Request, server: Server | null): string => {
  const cloudfareIp = request.headers.get("cf-connecting-ip");
  if (cloudfareIp) return cloudfareIp;

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();

  const serverIp = server?.requestIP(request)?.address as string;
  return serverIp || "unknown";
};

// Elysia server initialization and configuration
const mainApp = new Elysia()
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
        ? { message: "Internal server error" }
        : { error: error };

      return status(500, message);
    }
  })
  .use(
    rateLimit({
      duration: 15000,
      max: 7,
      generator: getRealIp,
      errorResponse: new Response(
        JSON.stringify({
          message: "Too many requests, please try again later",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      ),
    }),
  )
  .use(Headers)
  .all("*", ({ status }) => {
    return status(404, { message: "Not found :(" });
  });

if (nodeEnv !== "production") {
  mainApp.use(
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

const apiApp = new Elysia({ prefix: "/v1" });

apiApp
  .get("/health", async () => {
    return { status: "ok" };
  })
  .use(UserRoutes)
  .use(BudgetRoutes)
  .use(CategoryRoutes)
  .use(TransactionRoutes);

// Server setup
const app = mainApp.use(apiApp).listen(port);

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
