import { Elysia } from "elysia";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import {
  transactionList,
  transactionCreate,
  transactionDelete,
  transactionUpdate,
  transactionSummary,
} from "./service";

import {
  TransactionSchema,
  TransactionIdSchema,
  TransactionQuerySchema,
} from "./types";

const TransactionRoutes = new Elysia({
  strictPath: true,
  name: "TransactionApiV1",
  prefix: "/transactions",
  detail: { tags: ["Transaction"] },
})
  .use(Auth)
  .use(RedisLock)
  // ==Authenticated routes==
  // Create a new transaction
  .post(
    "",
    async ({ status, body, user, lock }) => {
      try {
        const { amount, category, type, description, date } = body;

        const lockKey = `CreateTransaction:${user.id}:${category}:${type}:${date}`;
        await lock.acquire(lockKey);

        const transactionResponse = await transactionCreate(
          { userId: user.id },
          { amount, category, type, description, date },
        );

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: TransactionSchema },
  )

  // Get all transactions for a user
  .get(
    "",
    async ({ status, user, query: { page, pageSize } }) => {
      try {
        const transactionResponse = await transactionList({
          userId: user.id,
          page,
          pageSize,
        });

        return status(transactionResponse.code, {
          message: transactionResponse.message,
          ...(transactionResponse.transactions && {
            transactions: transactionResponse.transactions,
          }),
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: TransactionQuerySchema },
  )

  .get("/summary", async ({ status, user }) => {
    try {
      const transactionResponse = await transactionSummary({ userId: user.id });

      return status(transactionResponse.code, {
        message: transactionResponse.message,
        ...(transactionResponse.summary && {
          transactionSummary: transactionResponse.summary,
        }),
      });
    } catch (error) {
      const { code, message } = handleError(error);

      return status(code, { message });
    }
  })

  // Update a transaction by ID
  .put(
    "/:transactionId",
    async ({ status, body, user, lock, params: { transactionId } }) => {
      try {
        const lockKey = `UpdateTransaction:${user.id}:${transactionId}`;
        await lock.acquire(lockKey);

        const { amount, category, type, description, date } = body;

        const transactionResponse = await transactionUpdate(
          { userId: user.id },
          { transactionId },
          { amount, category, type, description, date },
        );

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: TransactionSchema, params: TransactionIdSchema },
  )

  // Delete a transaction by ID
  .delete(
    "/:transactionId",
    async ({ status, user, lock, params: { transactionId } }) => {
      try {
        const lockKey = `DeleteTransaction:${user.id}:${transactionId}`;
        await lock.acquire(lockKey);

        const transactionResponse = await transactionDelete(
          { userId: user.id },
          { transactionId },
        );

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: TransactionIdSchema },
  );

export default TransactionRoutes;
