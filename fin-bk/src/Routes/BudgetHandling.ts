import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import { BudgetTypes, BudgetParamsTypes } from "../Types/BudgetTypes";

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

				const lockKey = `lock:CreateBudget:${user.id}:${category}:${month}:${year}`;

				const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
				if (!lockAcquired) {
					set.status = 429;
					return {
						message: "Too many requests, please wait a moment and try again",
					};
				}

				const [existingCategory, existingBudget] = await Promise.all([
					CategoryModel.exists({
						userId: user.id,
						_id: category,
					}),

					BudgetModel.exists({
						userId: user.id,
						category: category,
						month: month,
						year: year,
					}),
				]);

				if (!existingCategory) {
					set.status = 404;
					return { message: "Category not found" };
				}

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

				await Promise.all([
					BudgetModel.create(budgetData),
					Redis.del(`budgets:${user.id}`),
				]);

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
			const cacheKey = `budgets:${user.id}`;

			const cachedBudgets = await Redis.get(cacheKey);
			if (cachedBudgets) {
				set.status = 200;
				return { budgets: JSON.parse(cachedBudgets) };
			}

			const budgets = await BudgetModel.find(
				{ userId: user.id },
				{
					userId: 0,
					__v: 0,
				},
			)
				.sort({ month: -1 })
				.populate("category", {
					userId: 0,
					createdAt: 0,
					updatedAt: 0,
					__v: 0,
				})
				.lean();

			// Always return 200 with budgets array (even if empty)
			// This provides consistent API behavior
			if (budgets.length === 0) {
				set.status = 200;
				return { message: "No budgets found, or you have not created any" };
			}

			await Redis.set(cacheKey, JSON.stringify(budgets), "EX", 60 * 30);

			set.status = 200;
			return { budgets };
		} catch (error) {
			set.status = 500;
			console.error(error);
			return { message: "An internal server error occurred" };
		}
	})

	// Delete a budget by ID
	.delete(
		"/:budgetId",
		async ({ set, user, params: { budgetId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const lockKey = `lock:DeleteBudget:${budgetId}:${user.id}`;

			const lockAcquired = await Redis.set(lockKey, "1", "EX", 5, "NX");
			if (!lockAcquired) {
				set.status = 429;
				return {
					message: "Too many requests, please wait a moment and try again",
				};
			}

			try {
				const existingBudget = await BudgetModel.findOne(
					{
						_id: budgetId,
						userId: user.id,
					},
					{ category: 1, month: 1, year: 1 },
				);
				if (!existingBudget) {
					set.status = 404;
					return { message: "Budget not found" };
				}

				const transactionUsingBudget = await TransactionModel.exists({
					userId: user.id,
					category: existingBudget.category,
					date: {
						$gte: new Date(existingBudget.year, existingBudget.month - 1, 1),
						$lt: new Date(existingBudget.year, existingBudget.month, 1),
					},
				});
				if (transactionUsingBudget) {
					set.status = 400;
					return {
						message:
							"Budget cannot be deleted as it is being used in transactions",
					};
				}

				await BudgetModel.findOneAndDelete({
					_id: budgetId,
					userId: user.id,
				});

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
		},
		{ params: BudgetParamsTypes },
	);

export default BudgetRoutes;
