import { handleError } from "../../Utils/ErrorHandling";

import { getExistingCategory } from "../Category/category-db";
import { getExistingTransaction } from "../Transaction/transaction-db";
import {
  budgetListQuery,
  getExistingBudget,
  budgetCreateQuery,
  budgetUpdateQuery,
  budgetDeleteQuery,
  adjustBudgetQuery,
} from "./budget-db";

import type {
  TBudgetList,
  TBudgetCreate,
  TBudgetUpdate,
  TBudgetDelete,
  TBudgetOptional,
} from "./budget-types";

export const budgetCreateService = async ({
  userId,
  category: categoryId,
  limit,
  month,
  year,
}: TBudgetCreate) => {
  try {
    const [[existingCategory], [existingBudget]] = await Promise.all([
      getExistingCategory({ categoryId, userId, filter: "equal" }),
      getExistingBudget({
        userId,
        category: categoryId,
        month,
        year,
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
      category: categoryId,
      limit,
      month,
      year,
    };

    await budgetCreateQuery(budgetData);

    return { code: 201, message: "Budget created successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetListService = async ({
  userId,
  page,
  pageSize,
  month,
  year,
}: TBudgetList): Promise<
  | {
      code: 429 | 500;
      message: string;
    }
  | {
      code: 200;
      message: "Budgets retrieved successfully";
      budgets: {
        metadata: {
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
        data: {
          _id: number;
          category: {
            _id: number;
            categoryName: string;
            type: "income" | "expense";
          };
          limit: number;
          month: number;
          year: number;
          createdAt: Date;
          updatedAt: Date;
        }[];
      };
    }
  | {
      code: 200;
      message: "No budgets found, or you have not created any";
      budgets: {
        metadata: {
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
        data: [];
      };
    }
> => {
  try {
    const queries = budgetListQuery({ userId, page, pageSize, month, year });
    const [count, result] = await Promise.all([
      queries.totalCount,
      queries.dataResult,
    ]);

    const totalCount = count[0].totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 0;

    const budgets = result.map((item) => ({
      _id: item.budget.id,
      category: {
        _id: item.category.id,
        categoryName: item.category.categoryName,
        type: item.category.type,
      },
      limit: item.budget.limit,
      month: item.budget.month,
      year: item.budget.year,
      createdAt: item.budget.createdAt,
      updatedAt: item.budget.updatedAt,
    }));

    if (totalPages === 0 || page > totalPages) {
      return {
        code: 200,
        message: "No budgets found, or you have not created any",
        budgets: {
          metadata: { totalCount, page, pageSize, totalPages },
          data: [],
        },
      };
    }

    return {
      code: 200,
      message: "Budgets retrieved successfully",
      budgets: {
        metadata: { totalCount, page, pageSize, totalPages },
        data: budgets,
      },
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetUpdateService = async ({
  budgetId,
  userId,
  category: categoryId,
  limit,
  month,
  year,
}: TBudgetUpdate) => {
  try {
    const [currentBudget] = await getExistingBudget({
      budgetId,
      userId,
    });
    if (!currentBudget) {
      return { code: 404, message: "Budget not found" };
    }

    // Check if any of category, month, or year is being updated
    // and the new value is different from the current value
    const hasCategoryChanged =
      categoryId && currentBudget.categoryId !== categoryId;
    const hasMonthChanged = month && currentBudget.month !== month;
    const hasYearChanged = year && currentBudget.year !== year;

    if (hasCategoryChanged || hasMonthChanged || hasYearChanged) {
      const newCategory = categoryId || currentBudget.categoryId;
      const newMonth = month || currentBudget.month;
      const newYear = year || currentBudget.year;

      const [[existingBudget], [existingCategory], [transactionUsingBudget]] =
        await Promise.all([
          getExistingBudget({
            budgetId,
            userId,
            category: newCategory,
            month: newMonth,
            year: newYear,
            filter: "notEqual",
          }),
          getExistingCategory({
            categoryId: newCategory,
            userId,
            filter: "equal",
          }),
          getExistingTransaction({
            userId,
            category: currentBudget.categoryId,
            month: currentBudget.month,
            year: currentBudget.year,
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
      categoryId === undefined &&
      limit === undefined &&
      month === undefined &&
      year === undefined
    )
      return {
        code: 400,
        message: "Either category, limit, month, or year must be provided",
      };

    const updatedData: TBudgetOptional = {};
    if (categoryId !== undefined) updatedData.category = categoryId;
    if (limit !== undefined) updatedData.limit = limit;
    if (month !== undefined) updatedData.month = month;
    if (year !== undefined) updatedData.year = year;

    await budgetUpdateQuery({ budgetId, userId, ...updatedData });

    return { code: 200, message: "Budget updated successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const budgetDeleteService = async ({
  budgetId,
  userId,
}: TBudgetDelete) => {
  try {
    const [existingBudget] = await getExistingBudget({
      budgetId,
      userId,
      filter: "equal",
    });
    if (!existingBudget) {
      return { code: 404, message: "Budget not found" };
    }

    const [transactionUsingBudget] = await getExistingTransaction({
      userId,
      category: existingBudget.categoryId,
      month: existingBudget.month,
      year: existingBudget.year,
    });
    if (transactionUsingBudget) {
      return {
        code: 400,
        message: "Budget cannot be deleted as it is being used in transactions",
      };
    }

    await budgetDeleteQuery({ budgetId, userId });

    return { code: 200, message: "Budget deleted successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const adjustBudgetForTransaction = async (
  userId: number,
  categoryId: number,
  date: Date,
  amount: number,
  status: "refunded" | "deducted",
): Promise<{
  code: 200 | 400 | 404 | 429 | 500;
  message: string;
}> => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  try {
    const [existingBudget] = await getExistingBudget({
      userId,
      category: categoryId,
      month,
      year,
    });

    if (!existingBudget) return { code: 404, message: "Budget not found " };

    const [result] = await adjustBudgetQuery(
      userId,
      categoryId,
      month,
      year,
      amount,
      status,
    );

    if (result) return { code: 200, message: "Budget adjusted successfully" };

    if (!result && status === "deducted") {
      return {
        code: 400,
        message: "You don't have enough budget for this transaction",
      };
    }

    return {
      code: 500,
      message: "Internal server error: Budget record missing or inconsistent.",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
