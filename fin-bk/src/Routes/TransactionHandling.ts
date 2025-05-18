import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import TransactionModel from "../Model/TransactionModel";
import TransactionsTypes from "../Types/TransactionsTypes";

const TransactionRoutes = new Elysia({
	prefix: "/transactions",
	detail: { tags: ["Transaction"] },
})
	.use(Auth)
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
				JSON.stringify(transactions),
				60 * 30,
			);

			set.status = 200;
			return { transactions };
		} catch (error) {
			set.status = 500;
			console.error(error);
			return { message: "An internal server error occurred" };
		}
	})
	.put(
		"/:TransactionId",
		async ({ set, body, user, params: { TransactionId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const updatedTransaction = await TransactionModel.findOneAndUpdate(
					{ _id: TransactionId, userId: user.id },
					{
						...body,
					},
					{ new: true },
				);

				if (!updatedTransaction) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

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
	.delete(
		"/:TransactionId",
		async ({ set, user, params: { TransactionId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const TransactionIdExist = await TransactionModel.findOneAndDelete({
					_id: TransactionId,
					userId: user.id,
				});

				if (!TransactionIdExist) {
					set.status = 404;
					return { message: "Transaction not found" };
				}

				await Redis.del(`transactions:${user.id}`);

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
