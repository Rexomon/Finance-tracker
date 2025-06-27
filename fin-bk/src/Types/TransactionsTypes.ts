import { t } from "elysia";

export const TransactionsTypes = t.Object({
	amount: t.Number({ error: "Invalid amount" }),
	category: t.String({
		pattern: "^[0-9a-fA-F]{24}$",
		error: "Invalid category id",
	}),
	date: t.Date({ error: "Invalid date" }),
	description: t.String({ error: "Invalid description" }),
	type: t.Union([t.Literal("income"), t.Literal("expense")], {
		error: "Invalid transaction type",
	}),
});

export const TransactionParamsTypes = t.Object({
	transactionId: t.String({
		pattern: "^[0-9a-fA-F]{24}$",
		error: "Invalid transaction id",
	}),
});
