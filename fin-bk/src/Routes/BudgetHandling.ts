import { Elysia } from "elysia";
import redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetTypes from "../Types/BudgetTypes";
import BudgetModel from "../Model/BudgetModel";

const BudgetRoutes = new Elysia({
	prefix: "/budgets",
	detail: { tags: ["Budget"] },
})
	.use(Auth)
	.post(
		"/",
		async ({ set, user, body }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const { category, limit, month, year } = body;

				const existingBudget = await BudgetModel.findOne({
					userId: user.id,
					category: category,
					month: month,
					year: year,
				});

				if (existingBudget) {
					set.status = 409;
					return { message: "Budget already exists for the category for this month" };
				}

				const budgetData = {
          userId: user.id,
          category,
          limit,
          month,
          year
        };
        await BudgetModel.create(budgetData);

				set.status = 201;
				return { message: "Budget created successfully" };
			} catch (error) {
				set.status = 500;
				return { message: "Internal server error", error };
			}
		},
		{ body: BudgetTypes },
	)
	.get("/", async ({ set, user }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		try {
			const cacheBudgets = await redis.get(`budgets:${user.id}`);

			if (cacheBudgets) {
				set.status = 200;
				return { budgets: JSON.parse(cacheBudgets) };
			}

			const budgets = await BudgetModel.find(
				{ userId: user.id },
				{
					userId: 0,
					__v: 0,
				},
			).sort({ month: -1 });

			await redis.set(
				`budgets:${user.id}`,
				JSON.stringify(budgets),
				"EX",
				60 * 60 * 24,
			);

			set.status = 200;
			return { budgets };
		} catch (error) {
			set.status = 500;
			return { message: "Internal server error", error };
		}
	});

export default BudgetRoutes;
