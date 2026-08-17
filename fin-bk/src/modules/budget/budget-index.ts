import { Elysia } from "elysia";

import { redis } from "../../config/redis";

import Auth from "../../middleware/auth";

import { RedisLock } from "../../utils/redis-lock";
import { tryCatch, handleError } from "../../utils/error-handler";
import { invalidateUserBudgetCache } from "../../utils/redis-cache";

import {
  listBudgetService,
  createBudgetService,
  updateBudgetService,
  deleteBudgetService,
} from "./budget-service";

import {
  BudgetSchema,
  BudgetIdSchema,
  BudgetQuerySchema,
  BudgetOptionalSchema,
} from "./budget-types";

const BUDGET_CACHE_EXPIRY = 60 * 30; // 30 minutes

const TRANSACTION_SUMMARY_PREFIX = "transaction_summary:";

const BudgetRoutes = new Elysia({
  strictPath: true,
  name: "BudgetApiV1",
  prefix: "/budgets",
  detail: { tags: ["Budget"] },
})
  .use(Auth)
  .use(RedisLock)
  // ==Authenticated routes==
  // Create a new budget
  .post(
    "",
    async ({
      status,
      lock,
      user: { id: userId },
      body: { category, limit, month, year },
    }) => {
      const budgetCreationInput = { userId, category, limit, month, year };

      const lockKey = `CreateBudget:${userId}:${category}:${month}:${year}`;
      await lock.acquire(lockKey);

      const budgetCreationResult =
        await createBudgetService(budgetCreationInput);
      if (!budgetCreationResult.success) {
        return status(budgetCreationResult.error.code, {
          message: budgetCreationResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserBudgetCache(userId),
        redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
      ];

      await Promise.all(cacheInvalidationPromises);

      return status(budgetCreationResult.data.code, {
        message: budgetCreationResult.data.message,
      });
    },
    { body: BudgetSchema, auth: true },
  )

  // Get all budgets for a user
  .get(
    "",
    async ({
      status,
      user: { id: userId },
      query: { page, pageSize, month, year },
    }) => {
      const budgetListInput = { userId, page, pageSize, month, year };
      const cacheKey = `budgets:${userId}:${page}:${pageSize}:${month ?? "all"}:${year ?? "all"}`;

      const cachedBudgets = await redis.get(cacheKey);
      if (cachedBudgets) {
        return status(200, {
          message: "Budgets retrieved successfully",
          budgets: JSON.parse(cachedBudgets),
        });
      }

      const budgetListResult = await listBudgetService(budgetListInput);
      if (!budgetListResult.success) {
        return status(budgetListResult.error.code, {
          message: budgetListResult.error.message,
        });
      }

      await redis.set(
        cacheKey,
        JSON.stringify(budgetListResult.data.budgets),
        "EX",
        BUDGET_CACHE_EXPIRY,
      );

      return status(budgetListResult.data.code, {
        message: budgetListResult.data.message,
        budgets: budgetListResult.data.budgets,
      });
    },
    { query: BudgetQuerySchema, auth: true },
  )

  // Update a budget by ID
  .patch(
    "/:budgetId",
    async ({
      status,
      lock,
      user: { id: userId },
      params: { budgetId },
      body: { category, limit, month, year },
    }) => {
      const budgetUpdateInput = {
        budgetId,
        userId,
        category,
        limit,
        month,
        year,
      };
      const lockKey = `UpdateBudget:${budgetId}:${userId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const budgetUpdateResult = await updateBudgetService(budgetUpdateInput);
      if (!budgetUpdateResult.success) {
        return status(budgetUpdateResult.error.code, {
          message: budgetUpdateResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserBudgetCache(userId),
        redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
      ];

      await Promise.all(cacheInvalidationPromises);

      return status(budgetUpdateResult.data.code, {
        message: budgetUpdateResult.data.message,
      });
    },
    { body: BudgetOptionalSchema, params: BudgetIdSchema, auth: true },
  )

  // Delete a budget by ID
  .delete(
    "/:budgetId",
    async ({ status, lock, user: { id: userId }, params: { budgetId } }) => {
      const budgetDeletionInput = { budgetId, userId };
      const lockKey = `DeleteBudget:${budgetId}:${userId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const budgetDeletionResult =
        await deleteBudgetService(budgetDeletionInput);
      if (!budgetDeletionResult.success) {
        return status(budgetDeletionResult.error.code, {
          message: budgetDeletionResult.error.message,
        });
      }

      const cacheInvalidationPromises = [
        invalidateUserBudgetCache(userId),
        redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
      ];

      await Promise.all(cacheInvalidationPromises);
      return status(budgetDeletionResult.data.code, {
        message: budgetDeletionResult.data.message,
      });
    },
    { params: BudgetIdSchema, auth: true },
  );

export default BudgetRoutes;
