import Redis from "../../Config/Redis";

import { handleError } from "../../Utils/ErrorHandling";
import { invalidateUserBudgetCache } from "../../Utils/RedisCache";

import { categoryQueryExists } from "../Category/db";
import { transactionQueryExists } from "../Transaction/db";
import {
  budgetQueryFind,
  budgetQueryDelete,
  budgetQueryExists,
  budgetQueryUpdate,
  budgetQueryFindOne,
  createNewBudget,
} from "./db";

import type {
  TBudget,
  TBudgetId,
  TAdjustBudget,
  TBudgetUserId,
  TBudgetOptional,
  TBudgetPagination,
} from "./types";

export const budgetCreate = async ({
  userId,
  category,
  limit,
  month,
  year,
}: TBudgetUserId & TBudget) => {
  try {
    const [existingCategory, existingBudget] = await Promise.all([
      categoryQueryExists({ _id: category, userId }),
      budgetQueryExists({
        userId: userId,
        category: category,
        month: month,
        year: year,
      }),
    ]);
    if (!existingCategory) {
      return { code: 404, message: "Category not found" };
    }
    if (existingBudget) {
      return {
        code: 409,
        message: "Budget already exists for the category for this date",
      };
    }

    const budgetData = {
      userId,
      category,
      limit,
      month,
      year,
    };

    await createNewBudget(budgetData);
    await invalidateUserBudgetCache(userId);

    return { code: 201, message: "Budget created successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetList = async ({
  userId,
  page,
  pageSize,
}: TBudgetUserId & TBudgetPagination) => {
  try {
    const cacheKey = `budgets:${userId}:${page}:${pageSize}`;

    const cachedBudgets = await Redis.get(cacheKey);
    if (cachedBudgets) {
      return {
        code: 200,
        message: "Budgets retrieved successfully",
        budgets: JSON.parse(cachedBudgets),
      };
    }

    const budgets = await budgetQueryFind(userId, page, pageSize);
    if (budgets.data.length === 0) {
      return {
        code: 200,
        message: "No budgets found, or you have not created any",
        budgets: [],
      };
    }

    await Redis.set(cacheKey, JSON.stringify(budgets), "EX", 1800);

    return {
      code: 200,
      message: "Budgets retrieved successfully",
      budgets: budgets,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetUpdate = async ({
  budgetId,
  userId,
  category,
  limit,
  month,
  year,
}: TBudgetId & TBudgetUserId & TBudgetOptional) => {
  try {
    const currentBudget = await budgetQueryFindOne({
      _id: budgetId,
      userId,
    });
    if (!currentBudget) {
      return { code: 404, message: "Budget not found" };
    }

    // Check if any of category, month, or year is being updated
    // and the new value is different from the current value
    const hasCategoryChanged =
      category && currentBudget.category.toString() !== category;
    const hasMonthChanged = month && currentBudget.month !== month;
    const hasYearChanged = year && currentBudget.year !== year;

    if (hasCategoryChanged || hasMonthChanged || hasYearChanged) {
      const newCategory = category || currentBudget.category;
      const newMonth = month || currentBudget.month;
      const newYear = year || currentBudget.year;

      const [existingBudget, existingCategory, transactionUsingBudget] =
        await Promise.all([
          budgetQueryExists({
            _id: { $ne: budgetId },
            userId: userId,
            category: newCategory,
            month: newMonth,
            year: newYear,
          }),
          categoryQueryExists({ _id: newCategory, userId }),
          transactionQueryExists({
            userId: userId,
            category: currentBudget.category,
            date: {
              $gte: new Date(currentBudget.year, currentBudget.month - 1, 1),
              $lt: new Date(currentBudget.year, currentBudget.month, 1),
            },
          }),
        ]);
      if (existingBudget) {
        return {
          code: 409,
          message: "Budget already exists for the category for this date",
        };
      }
      if (!existingCategory) {
        return { code: 404, message: "Category not found" };
      }
      if (transactionUsingBudget) {
        return {
          code: 400,
          message:
            "Budget cannot be updated as it is being used in transactions",
        };
      }
    }

    if (
      category === undefined &&
      limit === undefined &&
      month === undefined &&
      year === undefined
    )
      return {
        code: 400,
        message: "Either category, limit, month, or year must be provided",
      };

    const updatedData: TBudgetOptional = {};
    if (category !== undefined) updatedData.category = category;
    if (limit !== undefined) updatedData.limit = limit;
    if (month !== undefined) updatedData.month = month;
    if (year !== undefined) updatedData.year = year;

    await budgetQueryUpdate({ _id: budgetId, userId }, updatedData);
    await invalidateUserBudgetCache(userId);

    return { code: 200, message: "Budget updated successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetDelete = async ({
  budgetId,
  userId,
}: TBudgetId & TBudgetUserId) => {
  try {
    const existingBudget = await budgetQueryFindOne({
      _id: budgetId,
      userId,
    });
    if (!existingBudget) {
      return { code: 404, message: "Budget not found" };
    }

    const transactionUsingBudget = await transactionQueryExists({
      userId,
      category: existingBudget.category,
      date: {
        $gte: new Date(existingBudget.year, existingBudget.month - 1, 1),
        $lt: new Date(existingBudget.year, existingBudget.month, 1),
      },
    });
    if (transactionUsingBudget) {
      return {
        code: 400,
        message: "Budget cannot be deleted as it is being used in transactions",
      };
    }

    await budgetQueryDelete({ budgetId, userId });
    await invalidateUserBudgetCache(userId);

    return { code: 200, message: "Budget deleted successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const adjustBudgetForTransaction = async (
  userId: string,
  category: string,
  date: Date,
  amount: number,
  status: "returned" | "deducted",
) => {
  try {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const filter: TAdjustBudget = {
      userId,
      category,
      month,
      year,
    };

    let budgetLimitAdjustment: number;

    if (status === "deducted") {
      filter.limit = { $gte: amount };
      budgetLimitAdjustment = -amount;
    } else {
      budgetLimitAdjustment = amount;
    }

    const result = await budgetQueryUpdate(filter, {
      $inc: { limit: budgetLimitAdjustment },
    });

    if (result) return { code: 200, message: "Budget adjusted successfully" };

    if (!result && status === "deducted") {
      return {
        code: 400,
        message: "You don't have enough budget for this transaction",
      };
    }

    console.error(
      `[Transaction] Data integrity error: Failed to return budget limit.`,
    );
    return {
      code: 500,
      message: "Internal server error: Budget record missing or inconsistent.",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
