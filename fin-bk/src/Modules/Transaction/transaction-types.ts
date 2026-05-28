import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";
import type { Prettify } from "../../Types/types";

export const TransactionUserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export const TransactionIdSchema = t.Object({
  transactionId: ObjectIdSchema,
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

export const TransactionQuerySchema = t.Object(
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
  },
  { additionalProperties: false },
);

export type TTransaction = typeof TransactionSchema.static;
export type TTransactionId = typeof TransactionIdSchema.static;
export type TTransactionUserId = typeof TransactionUserIdSchema.static;
export type TTransactionPagination = typeof TransactionQuerySchema.static;

export type TTransactionById = Prettify<TTransactionId & TTransactionUserId>;
export type TTransactionByCategory = Prettify<
  TTransactionUserId & Pick<TTransaction, "category">
>;
export type TTransactionList = Prettify<
  TTransactionUserId & TTransactionPagination
>;
export type TTransactionExist = Prettify<
  TTransactionUserId &
    Pick<TTransaction, "category"> & { month: number; year: number }
>;
export type TTransactionUpdate = Prettify<TTransactionById & TTransaction>;
export type TTransactionCreate = Prettify<TTransactionUserId & TTransaction>;
export type TTransactionDelete = TTransactionById;
