import { t } from "elysia";

const ObjecId = t.String({
  pattern: "^[0-9a-fA-F]{24}$",
  error: "Invalid id",
});

export const BudgetTypes = t.Object({
  category: ObjecId,
  limit: t.Number({ minimum: 1, error: "Invalid limit" }),
  month: t.Number({ minimum: 1, maximum: 12, error: "Invalid month" }),
  year: t.Number({ minimum: 1900, maximum: 2100, error: "Invalid year" }),
});

export const BudgetParamsTypes = t.Object({
  budgetId: ObjecId,
});

export const BudgetPatchTypes = t.Partial(BudgetTypes);
