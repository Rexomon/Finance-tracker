import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";
import type { Prettify } from "../../Types/types";

export const BudgetUserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export const BudgetIdSchema = t.Object({
  budgetId: ObjectIdSchema,
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

export const BudgetQuerySchema = t.Object(
  {
    page: t.Integer({
      minimum: 1,
      maximum: 10000,
      default: 1,
      error: "Invalid page number",
    }),
    pageSize: t.Integer({
      minimum: 10,
      maximum: 50,
      default: 10,
      error: "Invalid page size",
    }),
    month: t.Optional(
      t.Integer({ minimum: 1, maximum: 12, error: "Invalid month" }),
    ),
    year: t.Optional(
      t.Integer({ minimum: 1900, maximum: 2200, error: "Invalid year" }),
    ),
  },
  { additionalProperties: false },
);

export const BudgetOptionalSchema = t.Partial(BudgetSchema);

export type TBudget = typeof BudgetSchema.static;
export type TBudgetId = typeof BudgetIdSchema.static;
export type TBudgetUserId = typeof BudgetUserIdSchema.static;
export type TBudgetOptional = typeof BudgetOptionalSchema.static;
export type TBudgetPagination = typeof BudgetQuerySchema.static;

export type TBudgetUpdate = Prettify<
  TBudgetId & TBudgetUserId & TBudgetOptional
>;
export type TBudgetList = Prettify<TBudgetUserId & TBudgetPagination>;
export type TBudgetExist = Prettify<
  Partial<TBudgetId> & Omit<TBudgetUpdate, "limit" | "budgetId">
>;
export type TBudgetByCategory = Prettify<
  TBudgetUserId & Pick<TBudget, "category">
>;
export type TBudgetDelete = Prettify<TBudgetId & TBudgetUserId>;
export type TBudgetCreate = Prettify<TBudgetUserId & TBudget>;
export type TBudgetCreateQuery = Omit<TBudgetCreate, "userId">;
