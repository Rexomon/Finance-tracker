import { Elysia } from "elysia";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import {
  budgetCreate,
  budgetDelete,
  budgetList,
  budgetUpdate,
} from "./service";

import {
  BudgetSchema,
  BudgetIdSchema,
  BudgetOptionalSchema,
  BudgetQuerySchema,
} from "./types";

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
    async ({ status, body, user, lock }) => {
      try {
        const { category, limit, month, year } = body;

        const lockKey = `CreateBudget:${user.id}:${category}:${month}:${year}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetCreate({
          userId: user.id,
          category,
          limit,
          month,
          year,
        });

        return status(budgetResponse.code, {
          message: budgetResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: BudgetSchema },
  )

  // Get all budgets for a user
  .get(
    "",
    async ({ status, user, query: { page, pageSize } }) => {
      try {
        const budgetResponse = await budgetList({
          userId: user.id,
          page,
          pageSize,
        });

        return status(budgetResponse.code, {
          message: budgetResponse.message,
          ...(budgetResponse.budgets && { budgets: budgetResponse.budgets }),
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: BudgetQuerySchema },
  )

  // Update a budget by ID
  .patch(
    "/:budgetId",
    async ({ status, body, user, lock, params: { budgetId } }) => {
      try {
        const { category, limit, month, year } = body;

        const lockKey = `UpdateBudget:${budgetId}:${user.id}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetUpdate({
          budgetId,
          userId: user.id,
          category,
          limit,
          month,
          year,
        });

        return status(budgetResponse.code, {
          message: budgetResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: BudgetOptionalSchema, params: BudgetIdSchema },
  )

  // Delete a budget by ID
  .delete(
    "/:budgetId",
    async ({ status, user, lock, params: { budgetId } }) => {
      try {
        const lockKey = `DeleteBudget:${budgetId}:${user.id}`;
        await lock.acquire(lockKey);

        const budgetResponse = await budgetDelete({
          budgetId,
          userId: user.id,
        });

        return status(budgetResponse.code, {
          message: budgetResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: BudgetIdSchema },
  );

export default BudgetRoutes;
