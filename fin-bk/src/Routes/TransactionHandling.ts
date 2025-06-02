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

				if (type === "expense") {
					const month = new Date(date).getMonth() + 1;
					const year = new Date(date).getFullYear();

					const isBudgetExist = await BudgetModel.findOne({
						userId: user.id,
						category,
						month: month,
						year: year,
					});

					if (!isBudgetExist) {
						set.status = 404;
						return {
							message: "Please create a budget for this category first",
						};
					}

					const newBudgetLimit = await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category,
							month: month,
							year: year,
							limit: { $gte: amount },
						},
						{ $inc: { limit: -amount } },
						{ new: true },
					);

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
			const cacheTransactions = await Redis.get(`transactions:${user.id}`);

			if (cacheTransactions) {
				set.status = 200;
				return { transactions: JSON.parse(cacheTransactions) };
			}

			const transactions = await TransactionModel.find(
				{
					userId: user.id,
				},
				{ userId: 0, __v: 0 },
			).sort({ date: -1 });

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

				const updatedTransaction = await TransactionModel.findOneAndUpdate(
					{ _id: transactionId, userId: user.id },
					{
						amount,
						category,
						description,
						type,
						date,
					},
					{ new: false },
				);
				if (!updatedTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				if (updatedTransaction.type === "expense") {
					// Return the budget limit back to the original amount
					await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category: updatedTransaction.category,
							month: new Date(updatedTransaction.date).getMonth() + 1,
							year: new Date(updatedTransaction.date).getFullYear(),
						},
						{
							$inc: { limit: updatedTransaction.amount },
						},
					);
				}

				if (type === "expense") {
					// Deduct the budget limit from the new amount
					const currentBudget = await BudgetModel.findOne({
						userId: user.id,
						category,
						month: new Date(date).getMonth() + 1,
						year: new Date(date).getFullYear(),
					});

					if (!currentBudget) {
						set.status = 404;
						return {
							message: "Please create a budget for this category first",
						};
					}

					if (currentBudget.limit < amount) {
						set.status = 400;
						return {
							message: "You don't have enough budget for this transaction",
						};
					}

					await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category,
							month: new Date(date).getMonth() + 1,
							year: new Date(date).getFullYear(),
						},
						{ $inc: { limit: -amount } },
						{ new: true },
					);
				}

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
				const deleteTransaction = await TransactionModel.findOneAndDelete({
					_id: transactionId,
					userId: user.id,
				});

				if (!deleteTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				if (deleteTransaction.type === "expense") {
					await BudgetModel.findOneAndUpdate(
						{
							userId: user.id,
							category: deleteTransaction.category,
							month: new Date(deleteTransaction.date).getMonth() + 1,
							year: new Date(deleteTransaction.date).getFullYear(),
						},
						{
							$inc: { limit: deleteTransaction.amount },
						},
					);
				}

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
