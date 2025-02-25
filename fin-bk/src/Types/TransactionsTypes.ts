import { t } from "elysia";

const TransactionsTypes = t.Object({
	amount: t.Number(),
	category: t.String(),
	date: t.Date(),
	description: t.String(),
	type: t.Enum({ income: "income", expense: "expense" }),
});

export default TransactionsTypes;
