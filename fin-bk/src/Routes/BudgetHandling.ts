import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import {
  BudgetTypes,
  BudgetParamsTypes,
  BudgetPatchTypes,
} from "../Types/BudgetTypes";
import { RedisLock } from "../Utils/RedisLocking";

const BudgetRoutes = new Elysia({
  prefix: "/budgets",
  detail: { tags: ["Budget"] },
})
  .use(Auth)
  .use(RedisLock)
  // ==Authenticated routes==
  // Create a new budget
  .post(
    "/",
    async ({ set, body, user, lock }) => {
      try {
        const { category, limit, month, year } = body;

        const lockKey = `CreateBudget:${user.id}:${category}:${month}:${year}`;

        await lock.acquire(lockKey);

        const [existingCategory, existingBudget] = await Promise.all([
          CategoryModel.exists({
            userId: user.id,
            _id: category,
          }),

          BudgetModel.exists({
            userId: user.id,
            category: category,
            month: month,
            year: year,
          }),
        ]);

        if (!existingCategory) {
          set.status = 404;
          return { message: "Category not found" };
        }

        if (existingBudget) {
          set.status = 409;
          return {
            message: "Budget already exists for the category for this date",
          };
        }

        const budgetData = {
          userId: user.id,
          category,
          limit,
          month,
          year,
        };

        await Promise.all([
          BudgetModel.create(budgetData),
          Redis.del(`budgets:${user.id}`),
        ]);

        set.status = 201;
        return { message: "Budget created successfully" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          set.status = 429;
          return {
            message: "Too many requests, please wait a moment and try again",
          };
        }

        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
    { body: BudgetTypes },
  )

  // Get all budgets for a user
  .get("/", async ({ set, user }) => {
    try {
      const cacheKey = `budgets:${user.id}`;

      const cachedBudgets = await Redis.get(cacheKey);
      if (cachedBudgets) {
        set.status = 200;
        return { budgets: JSON.parse(cachedBudgets) };
      }

      const budgets = await BudgetModel.find(
        { userId: user.id },
        {
          userId: 0,
          __v: 0,
        },
      )
        .sort({ month: -1, year: -1 })
        .populate("category", {
          userId: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        })
        .lean();
      if (budgets.length === 0) {
        set.status = 200;
        return { message: "No budgets found, or you have not created any" };
      }

      await Redis.set(cacheKey, JSON.stringify(budgets), "EX", 60 * 30);

      set.status = 200;
      return { budgets };
    } catch (error) {
      set.status = 500;
      console.error(error);
      return { message: "An internal server error occurred" };
    }
  })

  // Update a budget by ID
  .patch(
    "/:budgetId",
    async ({ set, body, user, lock, params: { budgetId } }) => {
      try {
        const { category, limit, month, year } = body;

        const lockKey = `UpdateBudget:${budgetId}:${user.id}`;

        await lock.acquire(lockKey);

        const currentBudget = await BudgetModel.findOne({
          _id: budgetId,
          userId: user.id,
        });
        if (!currentBudget) {
          set.status = 404;
          return { message: "Budget not found" };
        }

        // Check if any of category, month, or year is being changed
        // and the value is different from the current one
        const hasCategoryChanged =
          category && currentBudget.category.toString() !== category;
        const hasMonthChanged = month && currentBudget.month !== month;
        const hasYearChanged = year && currentBudget.year !== year;

        if (hasCategoryChanged || hasMonthChanged || hasYearChanged) {
          const newCategory = category || currentBudget.category;
          const newMonth = month || currentBudget.month;
          const newYear = year || currentBudget.year;

          const [existingBudget, transactionUsingBudget, newCategoryExists] =
            await Promise.all([
              BudgetModel.exists({
                _id: { $ne: budgetId },
                userId: user.id,
                category: newCategory,
                month: newMonth,
                year: newYear,
              }),

              TransactionModel.exists({
                userId: user.id,
                category: currentBudget.category,
                date: {
                  $gte: new Date(
                    currentBudget.year,
                    currentBudget.month - 1,
                    1,
                  ),
                  $lt: new Date(currentBudget.year, currentBudget.month, 1),
                },
              }),

              CategoryModel.exists({ _id: newCategory, userId: user.id }),
            ]);

          if (existingBudget) {
            set.status = 409;
            return {
              message: "Budget already exists for the category for this date",
            };
          }

          if (transactionUsingBudget) {
            set.status = 400;
            return {
              message:
                "Budget cannot be updated as it is being used in transactions",
            };
          }

          if (!newCategoryExists) {
            set.status = 404;
            return { message: "Category not found" };
          }
        }

        const updatedBudget: typeof BudgetPatchTypes.static = {};
        if (category) updatedBudget.category = category;
        if (limit) updatedBudget.limit = limit;
        if (month) updatedBudget.month = month;
        if (year) updatedBudget.year = year;

        await Promise.all([
          BudgetModel.findOneAndUpdate(
            { _id: budgetId, userId: user.id },
            updatedBudget,
            { new: true },
          ),

          Redis.del(`budgets:${user.id}`),
        ]);

        set.status = 200;
        return { message: "Budget updated successfully" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          set.status = 429;
          return {
            message: "Too many requests, please wait a moment and try again",
          };
        }

        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
    { body: BudgetPatchTypes, params: BudgetParamsTypes },
  )

  // Delete a budget by ID
  .delete(
    "/:budgetId",
    async ({ set, user, lock, params: { budgetId } }) => {
      try {
        const lockKey = `DeleteBudget:${budgetId}:${user.id}`;

        await lock.acquire(lockKey);

        const existingBudget = await BudgetModel.findOne(
          {
            _id: budgetId,
            userId: user.id,
          },
          { category: 1, month: 1, year: 1 },
        );
        if (!existingBudget) {
          set.status = 404;
          return { message: "Budget not found" };
        }

        const transactionUsingBudget = await TransactionModel.exists({
          userId: user.id,
          category: existingBudget.category,
          date: {
            $gte: new Date(existingBudget.year, existingBudget.month - 1, 1),
            $lt: new Date(existingBudget.year, existingBudget.month, 1),
          },
        });
        if (transactionUsingBudget) {
          set.status = 400;
          return {
            message:
              "Budget cannot be deleted as it is being used in transactions",
          };
        }

        await Promise.all([
          BudgetModel.findOneAndDelete({
            _id: budgetId,
            userId: user.id,
          }),

          Redis.del(`budgets:${user.id}`),
        ]);

        set.status = 200;
        return { message: "Budget deleted successfully" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          set.status = 429;
          return {
            message: "Too many requests, please wait a moment and try again",
          };
        }

        set.status = 500;
        console.error(error);
        return { message: "An internal server error occurred" };
      }
    },
    { params: BudgetParamsTypes },
  );

export default BudgetRoutes;
