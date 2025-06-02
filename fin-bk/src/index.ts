import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import UserRoutes from "./Routes/UserHandling";
import BudgetRoutes from "./Routes/BudgetHandling";
import TransactionRoutes from "./Routes/TransactionHandling";
import connectToDatabase from "./Database/DatabaseConnection";
import { safelyCloseRedis } from "./Config/Redis";
import { safelyCloseMongoDB } from "./Database/DatabaseConnection";

await connectToDatabase();

// Ensure environment variables are set
const port = Number(Bun.env.PORT);
const nodeEnv = Bun.env.NODE_ENV;
const corsDomainOrigin = Bun.env.DOMAIN_ORIGIN;

if (nodeEnv === "production" && !corsDomainOrigin) {
	console.error("CORS domain origin is not set");
	process.exit(1);
}

// Elysia server initialization and configuration
const mainApp = new Elysia();

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
				],
			},
			path: "/swagger",
			scalarConfig: {
				darkMode: true,
				theme: "deepSpace",
			},
		}),
	);
}

const apiApp = new Elysia({ prefix: "/v1" });

apiApp
	.use(
		cors({
			origin: corsDomainOrigin || "*",
			credentials: true,
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type"],
			preflight: true,
			maxAge: 86400,
		}),
	)
	.get("/", async () => {
		return { message: "Hello, There!" };
	})
	.use(UserRoutes)
	.use(TransactionRoutes)
	.use(BudgetRoutes);

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
		await Promise.all([
			safelyCloseRedis(),
			safelyCloseMongoDB(),
			mainApp.server?.stop(true),
		]);
		console.log("Elysia server stopped safely");
		process.exit(0);
	} catch (error) {
		console.error("Error during shutdown:", error);
		process.exit(1);
	}
};

const closeSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
for (const SignalType of closeSignals) {
	process.on(SignalType, async () => {
		shutdownService(SignalType);
	});
}
