import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import Headers from "./Middleware/Headers";
import UserRoutes from "./Routes/UserHandling";
import connectToDatabase from "./Database/DatabaseConnection";
import TransactionRoutes from "./Routes/TransactionHandling";

connectToDatabase();

const app = new Elysia()
	.use(
		swagger({
			documentation: {
				info: {
					title: "Finance Backend API",
          version: "1.0.0"
				},
        tags: [
          { name: "User", description: "User related endpoints" },
          { name: "Transaction", description: "Transaction related endpoints" },
        ],
			},
		}),
	)
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
	.use(Headers)
	.get("/", async () => {
		return { message: "Hello, There!" };
	})
	.use(UserRoutes)
	.use(TransactionRoutes)
	.listen(Bun.env.PORT || 3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
