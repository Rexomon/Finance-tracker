import { t } from "elysia";

const TransactionsTypes = t.Object({
	amount: t.Number({ error: "Invalid amount" }),
	category: t.Optional(t.String()),
	date: t.Date({ error: "Invalid date" }),
	description: t.String(),
	type: t.Enum({ income: "income", expense: "expense", error: "Invalid type" }),
});

export default TransactionsTypes;
