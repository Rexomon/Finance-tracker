import { t } from "elysia";

const ObjectId = t.String({
  pattern: "^[0-9a-fA-F]{24}$",
  error: "Invalid id",
});

export const TransactionsTypes = t.Object({
  amount: t.Number({ error: "Invalid amount" }),
  category: ObjectId,
  date: t.Date({ error: "Invalid date" }),
  description: t.String({
    minLength: 1,
    maxLength: 256,
    error: "Invalid description",
  }),
  type: t.Union([t.Literal("income"), t.Literal("expense")], {
    error: "Invalid transaction type",
  }),
});

export const TransactionParamsTypes = t.Object({
  transactionId: ObjectId,
});
