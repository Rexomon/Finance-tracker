import { Elysia } from "elysia";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { tryCatch, handleError } from "../../Utils/ErrorHandling";
import {
  invalidateUserBudgetCache,
  invalidateUserTransactionCache,
} from "../../Utils/RedisCache";

import {
  listTransactionService,
  createTransactionService,
  deleteTransactionService,
  updateTransactionService,
  getTransactionSummaryService,
} from "./transaction-service";

import {
  TransactionSchema,
  TransactionIdSchema,
  TransactionQuerySchema,
} from "./transaction-types";

const TRANSACTION_CACHE_EXPIRY = 60 * 30; // 30 minutes

const TRANSACTION_SUMMARY_PREFIX = `transaction_summary:`;

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
    async ({
      status,
      lock,
      user: { id: userId },
      body: { category, amount, type, description, date },
    }) => {
      const transactionCreationInput = {
        userId,
        category,
        amount,
        type,
        description,
        date,
      };
      const lockKey = `CreateTransaction:${userId}:${category}:${type}:${date}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const transactionCreationResult = await createTransactionService(
        transactionCreationInput,
      );
      if (!transactionCreationResult.success) {
        return status(transactionCreationResult.error.code, {
          message: transactionCreationResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserTransactionCache(userId),
        redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
      ];
      if (type === "expense") {
        cacheInvalidationPromises.push(invalidateUserBudgetCache(userId));
      }

      await Promise.all(cacheInvalidationPromises);

      return status(transactionCreationResult.data.code, {
        message: transactionCreationResult.data.message,
      });
    },
    { body: TransactionSchema, auth: true },
  )

  // Get all transactions for a user
  .get(
    "",
    async ({ status, user: { id: userId }, query: { page, pageSize } }) => {
      const cacheKey = `transactions:${userId}:${page}:${pageSize}`;

      const cachedTransactions = await redis.get(cacheKey);
      if (cachedTransactions) {
        return status(200, {
          message: "Transactions retrieved successfully",
          transactions: JSON.parse(cachedTransactions),
        });
      }

      const transactionListResult = await listTransactionService({
        userId,
        page,
        pageSize,
      });
      if (!transactionListResult.success) {
        return status(transactionListResult.error.code, {
          message: transactionListResult.error.message,
        });
      }

      await redis.set(
        cacheKey,
        JSON.stringify(transactionListResult.data.transactions),
        "EX",
        TRANSACTION_CACHE_EXPIRY,
      );

      return status(transactionListResult.data.code, {
        message: transactionListResult.data.message,
        transactions: transactionListResult.data.transactions,
      });
    },
    { query: TransactionQuerySchema, auth: true },
  )

  .get(
    "/summary",
    async ({ status, user: { id: userId } }) => {
      const cacheKey = `${TRANSACTION_SUMMARY_PREFIX}${userId}`;

      const cachedSummary = await redis.get(cacheKey);
      if (cachedSummary) {
        return status(200, {
          message: "Transactions summary retrieved successfully",
          transactionSummary: JSON.parse(cachedSummary),
        });
      }

      const transactionSummaryResult = await getTransactionSummaryService({
        userId,
      });
      if (!transactionSummaryResult.success) {
        return status(transactionSummaryResult.error.code, {
          message: transactionSummaryResult.error.message,
        });
      }

      await redis.set(
        cacheKey,
        JSON.stringify(transactionSummaryResult.data.summary),
        "EX",
        1800,
      );

      return status(transactionSummaryResult.data.code, {
        message: transactionSummaryResult.data.message,
        transactionSummary: transactionSummaryResult.data.summary,
      });
    },
    { auth: true },
  )

  // Update a transaction by ID
  .put(
    "/:transactionId",
    async ({
      status,
      lock,
      user: { id: userId },
      params: { transactionId },
      body: { category, amount, type, description, date },
    }) => {
      const transactionUpdateInput = {
        transactionId,
        userId,
        category,
        amount,
        type,
        description,
        date,
      };
      const lockKey = `UpdateTransaction:${userId}:${transactionId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const transactionUpdateResult = await updateTransactionService(
        transactionUpdateInput,
      );
      if (!transactionUpdateResult.success) {
        return status(transactionUpdateResult.error.code, {
          message: transactionUpdateResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserBudgetCache(userId),
        invalidateUserTransactionCache(userId),
        redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
      ];

      await Promise.all(cacheInvalidationPromises);

      return status(transactionUpdateResult.data.code, {
        message: transactionUpdateResult.data.message,
      });
    },
    { body: TransactionSchema, params: TransactionIdSchema, auth: true },
  )

  // Delete a transaction by ID
  .delete(
    "/:transactionId",
    async ({
      status,
      lock,
      user: { id: userId },
      params: { transactionId },
    }) => {
      const transactionDeletionInput = { transactionId, userId };
      const lockKey = `DeleteTransaction:${userId}:${transactionId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const transactionDeletionResult = await deleteTransactionService(
        transactionDeletionInput,
      );
      if (!transactionDeletionResult.success) {
        return status(transactionDeletionResult.error.code, {
          message: transactionDeletionResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserTransactionCache(userId),
        redis.del(`transaction_summary:${userId}`),
      ];
      if (transactionDeletionResult.data.deletedType === "expense") {
        cacheInvalidationPromises.push(invalidateUserBudgetCache(userId));
      }

      await Promise.all(cacheInvalidationPromises);

      return status(transactionDeletionResult.data.code, {
        message: transactionDeletionResult.data.message,
      });
    },
    { params: TransactionIdSchema, auth: true },
  );

export default TransactionRoutes;
