import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import UserRoutes from "./Routes/UserHandling";
import BudgetRoutes from "./Routes/BudgetHandling";
import TransactionRoutes from "./Routes/TransactionHandling";
import connectToDatabase from "./Database/DatabaseConnection";

await connectToDatabase();

const app = new Elysia();

if (Bun.env.NODE_ENV !== "production") {
	app.use(
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
		}),
	);
}

app
	.use(
		cors({
			origin: Bun.env.DOMAIN_ORIGIN,
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
	.use(BudgetRoutes)
	.listen(Bun.env.PORT || 3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
