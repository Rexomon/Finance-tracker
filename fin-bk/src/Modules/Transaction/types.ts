import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";
import type { Prettify } from "../../Types/types";

export const TransactionUserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export const TransactionSchema = t.Object(
  {
    category: ObjectIdSchema,
    amount: t.Number({
      minimum: 0.01,
      error: "Invalid amount",
    }),
    type: t.Union([t.Literal("income"), t.Literal("expense")], {
      error: "Invalid transaction type",
    }),
    description: t.String({
      minLength: 1,
      maxLength: 256,
      error: "Invalid description",
    }),
    date: t.Date({ error: "Invalid date" }),
  },
  { additionalProperties: false },
);

export const TransactionDBQuerySchema = t.Intersect([
  t.Object({ userId: ObjectIdSchema }),
  t.Record(t.String(), t.Unknown()),
]);

export const TransactionQuerySchema = t.Object({
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
});

export const TransactionIdSchema = t.Object({
  transactionId: ObjectIdSchema,
});

export type TCurrentMonthSummaryAggregate = {
  totalIncome: number;
  totalExpense: number;
};

export type TExpenseByCategoryAggregate = {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
};

export type TMonthlyTrendsAggregate = {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
};

export type TTransactionAggregate = {
  data: ({ _id: string } & TTransaction)[];
  metadata: {
    totalCount: number;
  }[];
};

export type TTransaction = typeof TransactionSchema.static;
export type TTransactionId = typeof TransactionIdSchema.static;
export type TTransactionUserId = typeof TransactionUserIdSchema.static;
export type TTransactionDBQuery = typeof TransactionDBQuerySchema.static;
export type TTransactionPagination = typeof TransactionQuerySchema.static;

export type TTransactionDBUpdate = TTransaction;
export type TTransactionDBCreate = Prettify<TTransactionUserId & TTransaction>;
export type TTransactionDBDelete = Prettify<
  TTransactionId & TTransactionUserId
>;
