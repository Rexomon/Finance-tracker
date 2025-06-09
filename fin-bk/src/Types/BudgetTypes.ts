import { t } from "elysia";

export const BudgetTypes = t.Object({
	category: t.String({
		pattern: "^[0-9a-fA-F]{24}$",
		error: "Invalid category id",
	}),
	limit: t.Number({ minimum: 1, error: "Invalid limit" }),
	month: t.Number({ minimum: 1, maximum: 12, errror: "Invalid month" }),
	year: t.Number({ error: "Invalid year" }),
});

export default BudgetTypes;
