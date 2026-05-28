import { Elysia } from "elysia";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";
import { invalidateUserBudgetCache } from "../../Utils/RedisCache";

import {
  budgetListService,
  budgetCreateService,
  budgetUpdateService,
  budgetDeleteService,
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
      user: { id },
      body: { category, limit, month, year },
    }) => {
      const userId = id;
      const data = { userId, category, limit, month, year };

      try {
        const lockKey = `CreateBudget:${userId}:${category}:${month}:${year}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetCreateService(data);
        if (budgetResponse.code === 201) {
          const cacheKeysToDelete = [
            invalidateUserBudgetCache(userId),
            redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
          ];

          await Promise.all(cacheKeysToDelete);
        }

        return status(budgetResponse.code, { message: budgetResponse.message });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: BudgetSchema, auth: true },
  )

  // Get all budgets for a user
  .get(
    "",
    async ({
      status,
      user: { id },
      query: { page, pageSize, month, year },
    }) => {
      const userId = id;
      const filter = { userId, page, pageSize, month, year };

      try {
        const cacheKey = `budgets:${userId}:${page}:${pageSize}:${month ?? "all"}:${year ?? "all"}`;

        const cachedBudgets = await redis.get(cacheKey);
        if (cachedBudgets) {
          return status(200, {
            message: "Budgets retrieved successfully",
            budgets: JSON.parse(cachedBudgets),
          });
        }

        const budgetResponse = await budgetListService(filter);
        if (budgetResponse.code !== 200) {
          return status(budgetResponse.code, {
            message: budgetResponse.message,
          });
        }

        await redis.set(
          cacheKey,
          JSON.stringify(budgetResponse.budgets),
          "EX",
          BUDGET_CACHE_EXPIRY,
        );

        return status(budgetResponse.code, {
          message: budgetResponse.message,
          budgets: budgetResponse.budgets,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: BudgetQuerySchema, auth: true },
  )

  // Update a budget by ID
  .patch(
    "/:budgetId",
    async ({
      status,
      lock,
      user: { id },
      params: { budgetId },
      body: { category, limit, month, year },
    }) => {
      const userId = id;
      const filter = { budgetId, userId, category, limit, month, year };

      try {
        const lockKey = `UpdateBudget:${budgetId}:${userId}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetUpdateService(filter);
        if (budgetResponse.code === 200) {
          const cacheKeysToDelete = [
            invalidateUserBudgetCache(userId),
            redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
          ];

          await Promise.all(cacheKeysToDelete);
        }

        return status(budgetResponse.code, {
          message: budgetResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: BudgetOptionalSchema, params: BudgetIdSchema, auth: true },
  )

  // Delete a budget by ID
  .delete(
    "/:budgetId",
    async ({ status, lock, user: { id }, params: { budgetId } }) => {
      const userId = id;
      const filter = { budgetId, userId };

      try {
        const lockKey = `DeleteBudget:${budgetId}:${userId}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetDeleteService(filter);
        if (budgetResponse.code === 200) {
          const cacheKeysToDelete = [
            invalidateUserBudgetCache(userId),
            redis.del(`${TRANSACTION_SUMMARY_PREFIX}${userId}`),
          ];

          await Promise.all(cacheKeysToDelete);
        }

        return status(budgetResponse.code, {
          message: budgetResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: BudgetIdSchema, auth: true },
  );

export default BudgetRoutes;
