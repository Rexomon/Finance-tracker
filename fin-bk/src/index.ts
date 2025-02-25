import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import connectToDatabase from "./Database/DatabaseConnection";
import UserRoutes from "./Routes/UserHandling";

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
	.listen(Bun.env.PORT || 3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
