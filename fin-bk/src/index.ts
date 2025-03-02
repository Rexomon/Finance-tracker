import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import UserRoutes from "./Routes/UserHandling";
import connectToDatabase from "./Database/DatabaseConnection";
import TransactionRoutes from "./Routes/TransactionHandling";

connectToDatabase();

const corsOptions = {
	origin: Bun.env.DOMAIN_ORIGIN,
	method: ["GET", "POST", "PUT", "DELETE"],
	credentials: true,
};

const app = new Elysia()
	.use(cors(corsOptions))
	.get("/", async () => {
		return { message: "Hello, There!" };
	})
	.use(UserRoutes)
	.use(TransactionRoutes)
	.listen(Bun.env.PORT || 3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
