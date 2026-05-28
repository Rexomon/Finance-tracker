import { Elysia } from "elysia";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";
import {
  invalidateUserBudgetCache,
  invalidateUserTransactionCache,
} from "../../Utils/RedisCache";

import {
  transactionListService,
  transactionCreateService,
  transactionDeleteService,
  transactionUpdateService,
  transactionSummaryService,
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
      user: { id },
      body: { category, amount, type, description, date },
    }) => {
      const userId = id;
      const data = { userId, category, amount, type, description, date };

      try {
        const lockKey = `CreateTransaction:${userId}:${category}:${type}:${date}`;
        await lock.acquire(lockKey);

        const transactionResponse = await transactionCreateService(data);
        if (transactionResponse.code === 201) {
          const cacheKeysToDelete = [
            invalidateUserTransactionCache(userId),
            redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
          ];
          if (type === "expense") {
            cacheKeysToDelete.push(invalidateUserBudgetCache(userId));
          }

          await Promise.all(cacheKeysToDelete);
        }

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: TransactionSchema, auth: true },
  )

  // Get all transactions for a user
  .get(
    "",
    async ({ status, user: { id }, query: { page, pageSize } }) => {
      const userId = id;

      try {
        const cacheKey = `transactions:${userId}:${page}:${pageSize}`;

        const cachedTransactions = await redis.get(cacheKey);
        if (cachedTransactions) {
          return status(200, {
            message: "Transactions retrieved successfully",
            transactions: JSON.parse(cachedTransactions),
          });
        }

        const transactionResponse = await transactionListService({
          userId,
          page,
          pageSize,
        });
        if (transactionResponse.code !== 200) {
          return status(transactionResponse.code, {
            message: transactionResponse.message,
          });
        }

        await redis.set(
          cacheKey,
          JSON.stringify(transactionResponse.transactions),
          "EX",
          TRANSACTION_CACHE_EXPIRY,
        );

        return status(transactionResponse.code, {
          message: transactionResponse.message,
          transactions: transactionResponse.transactions,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: TransactionQuerySchema, auth: true },
  )

  .get(
    "/summary",
    async ({ status, user: { id } }) => {
      const userId = id;

      try {
        const cacheKey = `${TRANSACTION_SUMMARY_PREFIX}${userId}`;

        const cachedSummary = await redis.get(cacheKey);
        if (cachedSummary) {
          return status(200, {
            message: "Transactions summary retrieved successfully",
            transactionSummary: JSON.parse(cachedSummary),
          });
        }

        const transactionResponse = await transactionSummaryService({ userId });
        if (transactionResponse.code !== 200) {
          return status(transactionResponse.code, {
            message: transactionResponse.message,
          });
        }

        await redis.set(
          cacheKey,
          JSON.stringify(transactionResponse.summary),
          "EX",
          1800,
        );

        return status(transactionResponse.code, {
          message: transactionResponse.message,
          transactionSummary: transactionResponse.summary,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { auth: true },
  )

  // Update a transaction by ID
  .put(
    "/:transactionId",
    async ({
      status,
      lock,
      user: { id },
      params: { transactionId },
      body: { category, amount, type, description, date },
    }) => {
      const userId = id;
      const filter = {
        transactionId,
        userId,
        category,
        amount,
        type,
        description,
        date,
      };

      try {
        const lockKey = `UpdateTransaction:${userId}:${transactionId}`;
        await lock.acquire(lockKey);

        const transactionResponse = await transactionUpdateService(filter);
        if (transactionResponse.code === 200) {
          const cacheKeysToDelete = [
            invalidateUserBudgetCache(userId),
            invalidateUserTransactionCache(userId),
            redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
          ];

          await Promise.all(cacheKeysToDelete);
        }

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: TransactionSchema, params: TransactionIdSchema, auth: true },
  )

  // Delete a transaction by ID
  .delete(
    "/:transactionId",
    async ({ status, lock, user: { id }, params: { transactionId } }) => {
      const userId = id;
      const filter = { transactionId, userId };

      try {
        const lockKey = `DeleteTransaction:${userId}:${transactionId}`;
        await lock.acquire(lockKey);

        const transactionResponse = await transactionDeleteService(filter);
        if (transactionResponse.code === 200) {
          const cacheKeysToDelete = [
            invalidateUserTransactionCache(userId),
            redis.del(`transaction_summary:${userId}`),
          ];
          if (transactionResponse.deletedType === "expense") {
            cacheKeysToDelete.push(invalidateUserBudgetCache(userId));
          }

          await Promise.all(cacheKeysToDelete);
        }

        return status(transactionResponse.code, {
          message: transactionResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: TransactionIdSchema, auth: true },
  );

export default TransactionRoutes;
