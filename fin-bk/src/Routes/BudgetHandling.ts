import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetTypes from "../Types/BudgetTypes";
import BudgetModel from "../Model/BudgetModel";

const BudgetRoutes = new Elysia({
	prefix: "/budgets",
	detail: { tags: ["Budget"] },
})
	.use(Auth)
  // ==Authenticated routes==
  // Create a new budget
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
					return {
						message: "Budget already exists for the category for this month",
					};
				}

				const budgetData = {
					userId: user.id,
					category,
					limit,
					month,
					year,
				};
				await BudgetModel.create(budgetData);
				await Redis.del(`budgets:${user.id}`);

				set.status = 201;
				return { message: "Budget created successfully" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: BudgetTypes },
	)

  // Get all budgets for a user
	.get("/", async ({ set, user }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		try {
			const cacheBudgets = await Redis.get(`budgets:${user.id}`);

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

			await Redis.setex(
				`budgets:${user.id}`,
				60 * 60 * 24,
				JSON.stringify(budgets),
			);

			set.status = 200;
			return { budgets };
		} catch (error) {
			set.status = 500;
			console.error(error);
			return { message: "An internal server error occurred" };
		}
	})

  // Delete a budget by ID
	.delete("/:budgetId", async ({ set, user, params: { budgetId } }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		const objectIdRegex = /^[0-9a-fA-F]{24}$/;
		if (!objectIdRegex.test(budgetId)) {
			set.status = 400;
			return { message: "Invalid budget id" };
		}

		try {
			const deleteBudget = await BudgetModel.findOneAndDelete({
				_id: budgetId,
				userId: user.id,
			});

			if (!deleteBudget) {
				set.status = 404;
				return { message: "Budget not found" };
			}

			await Redis.del(`budgets:${user.id}`);

			set.status = 200;
			return { message: "Budget deleted successfully" };
		} catch (error) {
			if (error instanceof Error && error.name === "CastError") {
				set.status = 400;
				return { message: "Invalid budget id" };
			}
			set.status = 500;
			console.error(error);
			return { message: "An internal server error occurred" };
		}
	});

export default BudgetRoutes;
