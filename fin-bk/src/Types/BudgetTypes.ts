import { t } from "elysia";

export const BudgetTypes = t.Object({
	category: t.String(),
	limit: t.Number({ minimum: 1 }),
	month: t.Number({ minimum: 1, maximum: 12 }),
	year: t.Number(),
});

export default BudgetTypes;
