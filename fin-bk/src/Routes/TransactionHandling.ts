import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
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

				const transactionData = {
					userId: user.id,
					amount,
					category,
					type,
					description,
					date,
				};

				// Deduct budget limit if the transaction is an expense
				if (type === "expense") {
					const month = new Date(date).getMonth() + 1;
					const year = new Date(date).getFullYear();

					const [existingBudget, newBudgetLimit] = await Promise.all([
						BudgetModel.findOne({
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

					await Redis.del(`budgets:${user.id}`);
				}

				await TransactionModel.create(transactionData);
				await Redis.del(`transactions:${user.id}`);

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
			const cachedTransactions = await Redis.get(`transactions:${user.id}`);
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

			await Redis.setex(
				`transactions:${user.id}`,
				60 * 30,
				JSON.stringify(transactions),
			);

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

			try {
				const { amount, category, type, description, date } = body;

				const [existingTransaction, budgetForUpdate] = await Promise.all([
					TransactionModel.findOne({
						_id: transactionId,
						userId: user.id,
					}),

					// Find the budget based on the incoming category and date [budgetForUpdate]
					// This is to ensure that the budget is exist before updating the transaction
					BudgetModel.findOne({
						userId: user.id,
						category,
						month: new Date(date).getMonth() + 1,
						year: new Date(date).getFullYear(),
					}),
				]);

				if (!budgetForUpdate) {
					set.status = 404;
					return {
						message: "Please create a budget for this category first",
					};
				}

				if (!existingTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				const existingBudgetInTransaction = await BudgetModel.findOne({
					userId: user.id,
					category: existingTransaction.category,
					month: new Date(existingTransaction.date).getMonth() + 1,
					year: new Date(existingTransaction.date).getFullYear(),
				});

				if (!existingBudgetInTransaction) {
					set.status = 404;
					return {
						message:
							"This might be an error. Budget not found as it need to be connected to the transaction",
					};
				}

				// These logics are to ensure that the budget is enough for the new transaction
				let isBudgetEnough = false;
				const isSameCategory = existingBudgetInTransaction._id.equals(
					budgetForUpdate._id,
				);

				if (isSameCategory) {
					const returnedLimit =
						existingBudgetInTransaction.limit + existingTransaction.amount;

					// If the old budget category is the same as the new budget category,
					// then we can use the returned budget limit to check if the budget is enough,
					// for the new transaction
					if (returnedLimit >= amount) {
						isBudgetEnough = true;
					}
				} else {
					// If the old budget category is different from the new budget category,
					// then we need to check if the new budget limit is enough for the new transaction
					if (budgetForUpdate.limit >= amount) {
						isBudgetEnough = true;
					}
				}

				// Return the budget limit back to the original amount,
				// if the old transaction type is expense and the budget is enough for the new transaction to be created
				if (existingTransaction.type === "expense" && isBudgetEnough) {
					const updatedBudgetLimit = await BudgetModel.findByIdAndUpdate(
						existingBudgetInTransaction._id,
						{ $inc: { limit: existingTransaction.amount } },
						{ new: true },
					);

					if (!updatedBudgetLimit) {
						set.status = 404;
						return {
							message: "Budget not found",
						};
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

				await TransactionModel.findOneAndUpdate(
					{ _id: transactionId, userId: user.id },
					updatedTransaction,
					{ new: true },
				);

				await Redis.del(`budgets:${user.id}`);
				await Redis.del(`transactions:${user.id}`);

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

				await TransactionModel.findOneAndDelete(deletedTransaction);
				await Redis.del(`transactions:${user.id}`);
				await Redis.del(`budgets:${user.id}`);

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
