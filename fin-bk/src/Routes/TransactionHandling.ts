import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import TransactionsTypes from "../Types/TransactionsTypes";

const TransactionRoutes = new Elysia({
	prefix: "/transactions",
	detail: { tags: ["Transaction"] },
})
	.use(Auth)
	// ==Authenticated routes==
	// Create a new transaction
	.post(
		"/",
		async ({ set, body, user }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const { amount, category, type, description, date } = body;

				const existingCategory = await CategoryModel.exists({
					userId: user.id,
					_id: category,
				});
				if (!existingCategory) {
					set.status = 404;
					return { message: "Category not found" };
				}

				const lockKey = `lock:CreateTransaction:${user.id}:${category}:${type}:${date}`;

				const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
				if (!lockAcquired) {
					set.status = 429;
					return {
						message: "Too many requests, please wait a moment and try again",
					};
				}

				// Deduct budget limit if the transaction is an expense
				if (type === "expense") {
					const month = new Date(date).getMonth() + 1;
					const year = new Date(date).getFullYear();

					const [existingBudget, newBudgetLimit] = await Promise.all([
						BudgetModel.exists({
							userId: user.id,
							category: category,
							month: month,
							year: year,
						}),

						BudgetModel.findOneAndUpdate(
							{
								userId: user.id,
								category: category,
								month: month,
								year: year,
								limit: { $gte: amount },
							},
							{ $inc: { limit: -amount } },
							{ new: true },
						),
					]);

					if (!existingBudget) {
						set.status = 404;
						return {
							message: "Please create a budget for this category first",
						};
					}

					if (!newBudgetLimit) {
						set.status = 400;
						return {
							message: "You don't have enough budget for this transaction",
						};
					}
				}

				const transactionData = {
					userId: user.id,
					amount,
					category,
					type,
					description,
					date,
				};

				// Collect all cache keys that need to be deleted
				const cacheKeysToDelete = [`transactions:${user.id}`];
				if (type === "expense") {
					cacheKeysToDelete.push(`budgets:${user.id}`);
				}

				await Promise.all([
					TransactionModel.create(transactionData),
					Redis.del(...cacheKeysToDelete),
				]);

				set.status = 201;
				return { message: "Transaction created" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: TransactionsTypes },
	)

	// Get all transactions for a user
	.get("/", async ({ set, user }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		try {
			const cacheKey = `transactions:${user.id}`;

			const cachedTransactions = await Redis.get(cacheKey);
			if (cachedTransactions) {
				set.status = 200;
				return { transactions: JSON.parse(cachedTransactions) };
			}

			const transactions = await TransactionModel.find(
				{
					userId: user.id,
				},
				{ userId: 0, __v: 0 },
			)
				.sort({ date: -1 })
				.populate("category", {
					userId: 0,
					createdAt: 0,
					updatedAt: 0,
					__v: 0,
				});

			await Redis.set(cacheKey, JSON.stringify(transactions), "EX", 60 * 30);

			set.status = 200;
			return { transactions };
		} catch (error) {
			set.status = 500;
			console.error(error);
			return { message: "An internal server error occurred" };
		}
	})

	// Update a transaction by ID
	.put(
		"/:transactionId",
		async ({ set, body, user, params: { transactionId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const objectIdRegex = /^[0-9a-fA-F]{24}$/;
			if (!objectIdRegex.test(transactionId)) {
				set.status = 400;
				return { message: "Invalid transaction id" };
			}

			const lockKey = `lock:UpdateTransaction:${user.id}:${transactionId}`;

			const lockAcquired = await Redis.set(lockKey, "1", "EX", 5, "NX");
			if (!lockAcquired) {
				set.status = 429;
				return {
					message: "Too many requests, please wait a moment and try again",
				};
			}

			try {
				const { amount, category, type, description, date } = body;

				const existingTransaction = await TransactionModel.findOne({
					_id: transactionId,
					userId: user.id,
				});
				if (!existingTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				// Return budget limit if the existing transaction is an expense
				if (existingTransaction.type === "expense") {
					const returnedLimit = await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category: existingTransaction.category,
							month: new Date(existingTransaction.date).getMonth() + 1,
							year: new Date(existingTransaction.date).getFullYear(),
						},
						{ $inc: { limit: existingTransaction.amount } },
						{ new: true },
					);

					if (!returnedLimit) {
						set.status = 404;
						return { message: "Budget not found" };
					}
				}

				// Check if the new transaction is an expense and deduct budget limit
				if (type === "expense") {
					const deductedBudgetLimit = await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category,
							month: new Date(date).getMonth() + 1,
							year: new Date(date).getFullYear(),
							limit: { $gte: amount },
						},
						{ $inc: { limit: -amount } },
						{ new: true },
					);

					if (!deductedBudgetLimit) {
						// If the budget limit is not sufficient, return the limit back to the previous transaction
						if (existingTransaction.type === "expense") {
							const decreasedLimit = await BudgetModel.findOneAndUpdate(
								{
									userId: user.id,
									category: existingTransaction.category,
									month: new Date(existingTransaction.date).getMonth() + 1,
									year: new Date(existingTransaction.date).getFullYear(),
								},
								{ $inc: { limit: -existingTransaction.amount } },
								{ new: true },
							);

							if (!decreasedLimit) {
								set.status = 404;
								return { message: "Budget not found" };
							}
						}

						set.status = 400;
						return {
							message: "You don't have enough budget for this transaction",
						};
					}
				}

				const updatedTransaction = {
					amount,
					category,
					type,
					description,
					date,
				};

				const cacheKeysToDelete = [
					`transactions:${user.id}`,
					`budgets:${user.id}`,
				];

				await Promise.all([
					TransactionModel.findOneAndUpdate(
						{ _id: transactionId, userId: user.id },
						updatedTransaction,
						{ new: true },
					),

					Redis.del(...cacheKeysToDelete),
				]);

				set.status = 200;
				return { message: "Transaction updated" };
			} catch (error) {
				if (error instanceof Error && error.name === "CastError") {
					set.status = 400;
					return { message: "Invalid transaction id" };
				}

				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: TransactionsTypes },
	)

	// Delete a transaction by ID
	.delete(
		"/:transactionId",
		async ({ set, user, params: { transactionId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const objectIdRegex = /^[0-9a-fA-F]{24}$/;
			if (!objectIdRegex.test(transactionId)) {
				set.status = 400;
				return { message: "Invalid transaction id" };
			}

			try {
				const existingTransaction = await TransactionModel.findOne({
					userId: user.id,
					_id: transactionId,
				});
				if (!existingTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				if (existingTransaction.type === "expense") {
					const updatedBudget = await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category: existingTransaction.category,
							month: new Date(existingTransaction.date).getMonth() + 1,
							year: new Date(existingTransaction.date).getFullYear(),
						},
						{
							$inc: { limit: existingTransaction.amount },
						},
					);

					if (!updatedBudget) {
						set.status = 404;
						return {
							message: "Budget not found",
						};
					}
				}

				const deletedTransaction = {
					_id: transactionId,
					userId: user.id,
				};

				// Collect all cache keys that need to be deleted
				const cacheKeysToDelete = [`transactions:${user.id}`];
				if (existingTransaction.type === "expense") {
					cacheKeysToDelete.push(`budgets:${user.id}`);
				}

				await Promise.all([
					TransactionModel.findOneAndDelete(deletedTransaction),
					Redis.del(...cacheKeysToDelete),
				]);

				set.status = 200;
				return { message: "Transaction deleted" };
			} catch (error) {
				if (error instanceof Error && error.name === "CastError") {
					set.status = 400;
					return { message: "Invalid transaction id" };
				}

				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
	);

export default TransactionRoutes;
