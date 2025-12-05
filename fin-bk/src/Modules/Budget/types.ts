import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";
import type { Prettify } from "../../Types/types";

export const BudgetUserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export const BudgetSchema = t.Object(
  {
    category: ObjectIdSchema,
    limit: t.Integer({ minimum: 1, error: "Invalid limit" }),
    month: t.Integer({ minimum: 1, maximum: 12, error: "Invalid month" }),
    year: t.Integer({ minimum: 1900, maximum: 2200, error: "Invalid year" }),
  },
  { additionalProperties: false },
);

export const BudgetDBQuerySchema = t.Intersect([
  t.Object({ userId: ObjectIdSchema }),
  t.Record(t.String(), t.Unknown()),
]);

export const BudgetQuerySchema = t.Object({
  page: t.Integer({ minimum: 1, default: 1, error: "Invalid page number" }),
  pageSize: t.Integer({
    minimum: 10,
    maximum: 50,
    default: 10,
    error: "Invalid page size",
  }),
});

export const BudgetIdSchema = t.Object({
  budgetId: ObjectIdSchema,
});

export const BudgetOptionalSchema = t.Partial(BudgetSchema);

export type TBudget = typeof BudgetSchema.static;
export type TBudgetId = typeof BudgetIdSchema.static;
export type TBudgetUserId = typeof BudgetUserIdSchema.static;
export type TBudgetDBQuery = typeof BudgetDBQuerySchema.static;
export type TBudgetOptional = typeof BudgetOptionalSchema.static;
export type TBudgetPagination = typeof BudgetQuerySchema.static;

export type TBudgetDBDelete = Prettify<TBudgetId & TBudgetUserId>;
export type TBudgetDBCreate = Prettify<TBudgetUserId & TBudget>;
export type TBudgetDBUpdate = Prettify<
  TBudgetOptional & { $inc?: { limit: number } }
>;
export type TAdjustBudget = Prettify<
  TBudgetUserId &
    Omit<TBudget, "limit"> & {
      limit?: { $gte: number };
    }
>;
