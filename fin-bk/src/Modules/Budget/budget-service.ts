import {
  error,
  success,
  tryCatch,
  handleError,
} from "../../Utils/ErrorHandling";

import { getExistingCategoryQuery } from "../Category/category-db";
import { getExistingTransactionQuery } from "../Transaction/transaction-db";
import {
  listBudgetQuery,
  getExistingBudgetQuery,
  createBudgetQuery,
  updateBudgetQuery,
  deleteBudgetQuery,
  adjustBudgetQuery,
} from "./budget-db";

import type {
  TBudgetList,
  TBudgetCreate,
  TBudgetUpdate,
  TBudgetDelete,
  TBudgetOptional,
} from "./budget-types";

export const createBudgetService = async ({
  userId,
  category: categoryId,
  limit,
  month,
  year,
}: TBudgetCreate) => {
  const budgetCreationValidationResult = await tryCatch(async () => {
    const [[existingCategory], [existingBudget]] = await Promise.all([
      getExistingCategoryQuery({ categoryId, userId, matchMode: "equal" }),
      getExistingBudgetQuery({
        userId,
        category: categoryId,
        month,
        year,
      }),
    ]);

    return { existingCategory, existingBudget };
  });
  if (!budgetCreationValidationResult.success) {
    const { code, message } = handleError(budgetCreationValidationResult.error);
    return error({ code, message });
  }

  const { existingCategory, existingBudget } =
    budgetCreationValidationResult.data;
  if (!existingCategory) {
    return error({ code: 404, message: "Category not found" });
  }
  if (existingBudget) {
    return error({
      code: 409,
      message: "Budget already exists for the category for this date",
    });
  }

  const budgetCreationInput = {
    category: categoryId,
    limit,
    month,
    year,
  };

  const budgetCreationResult = await tryCatch(() =>
    createBudgetQuery(budgetCreationInput),
  );
  if (!budgetCreationResult.success) {
    const { code, message } = handleError(budgetCreationResult.error);
    return error({ code, message });
  }

  return success({ code: 201, message: "Budget created successfully" });
};

export const listBudgetService = async ({
  userId,
  page,
  pageSize,
  month,
  year,
}: TBudgetList) => {
  const budgetListResult = await tryCatch(async () => {
    const budgetQueries = listBudgetQuery({
      userId,
      page,
      pageSize,
      month,
      year,
    });
    const [[budgetCountRow], budgetRows] = await Promise.all([
      budgetQueries.budgetCountQuery,
      budgetQueries.budgetListQuery,
    ]);

    return { budgetCountRow, budgetRows };
  });
  if (!budgetListResult.success) {
    const { code, message } = handleError(budgetListResult.error);
    return error({ code, message });
  }

  const { budgetCountRow, budgetRows } = budgetListResult.data;
  const totalCount = budgetCountRow.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 0;

  const budgets = budgetRows.map((budgetRow) => ({
    _id: budgetRow.budget.id,
    category: {
      _id: budgetRow.category.id,
      categoryName: budgetRow.category.categoryName,
      type: budgetRow.category.type,
    },
    limit: budgetRow.budget.limit,
    month: budgetRow.budget.month,
    year: budgetRow.budget.year,
    createdAt: budgetRow.budget.createdAt,
    updatedAt: budgetRow.budget.updatedAt,
  }));

  if (totalPages === 0 || page > totalPages) {
    return success({
      code: 200,
      message: "No budgets found, or you have not created any",
      budgets: {
        metadata: { totalCount, page, pageSize, totalPages },
        data: [],
      },
    });
  }

  return success({
    code: 200,
    message: "Budgets retrieved successfully",
    budgets: {
      metadata: { totalCount, page, pageSize, totalPages },
      data: budgets,
    },
  });
};

export const updateBudgetService = async ({
  budgetId,
  userId,
  category: categoryId,
  limit,
  month,
  year,
}: TBudgetUpdate) => {
  const currentBudgetResult = await tryCatch(async () => {
    const [currentBudget] = await getExistingBudgetQuery({
      budgetId,
      userId,
    });

    return currentBudget;
  });

  if (!currentBudgetResult.success) {
    const { code, message } = handleError(currentBudgetResult.error);
    return error({ code, message });
  }

  const currentBudget = currentBudgetResult.data;
  if (!currentBudget) {
    return error({ code: 404, message: "Budget not found" });
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

    const budgetUpdateValidationResult = await tryCatch(async () => {
      const [
        [conflictingBudget],
        [existingCategory],
        [transactionUsingBudget],
      ] = await Promise.all([
        getExistingBudgetQuery({
          budgetId,
          userId,
          category: newCategory,
          month: newMonth,
          year: newYear,
          matchMode: "notEqual",
        }),
        getExistingCategoryQuery({
          categoryId: newCategory,
          userId,
          matchMode: "equal",
        }),
        getExistingTransactionQuery({
          userId,
          category: currentBudget.categoryId,
          month: currentBudget.month,
          year: currentBudget.year,
        }),
      ]);

      return { conflictingBudget, existingCategory, transactionUsingBudget };
    });
    if (!budgetUpdateValidationResult.success) {
      const { code, message } = handleError(budgetUpdateValidationResult.error);
      return error({ code, message });
    }

    const { conflictingBudget, existingCategory, transactionUsingBudget } =
      budgetUpdateValidationResult.data;
    if (conflictingBudget) {
      return error({
        code: 409,
        message: "Budget already exists for the category for this date",
      });
    }
    if (!existingCategory) {
      return error({ code: 404, message: "Category not found" });
    }
    if (transactionUsingBudget) {
      return error({
        code: 400,
        message: "Budget cannot be updated as it is being used in transactions",
      });
    }
  }

  if (
    categoryId === undefined &&
    limit === undefined &&
    month === undefined &&
    year === undefined
  )
    return error({
      code: 400,
      message: "Either category, limit, month, or year must be provided",
    });

  const budgetUpdateData: TBudgetOptional = {};
  if (categoryId !== undefined) budgetUpdateData.category = categoryId;
  if (limit !== undefined) budgetUpdateData.limit = limit;
  if (month !== undefined) budgetUpdateData.month = month;
  if (year !== undefined) budgetUpdateData.year = year;

  const budgetUpdateResult = await tryCatch(() =>
    updateBudgetQuery({ budgetId, userId, ...budgetUpdateData }),
  );
  if (!budgetUpdateResult.success) {
    const { code, message } = handleError(budgetUpdateResult.error);
    return error({ code, message });
  }

  return success({ code: 200, message: "Budget updated successfully" });
};

export const deleteBudgetService = async ({
  budgetId,
  userId,
}: TBudgetDelete) => {
  const existingBudgetResult = await tryCatch(async () => {
    const [existingBudget] = await getExistingBudgetQuery({
      budgetId,
      userId,
      matchMode: "equal",
    });

    return existingBudget;
  });
  if (!existingBudgetResult.success) {
    const { code, message } = handleError(existingBudgetResult.error);
    return error({ code, message });
  }

  const existingBudget = existingBudgetResult.data;
  if (!existingBudget) {
    return error({ code: 404, message: "Budget not found" });
  }

  const budgetUsageResult = await tryCatch(async () => {
    const [transactionUsingBudget] = await getExistingTransactionQuery({
      userId,
      category: existingBudget.categoryId,
      month: existingBudget.month,
      year: existingBudget.year,
    });

    return transactionUsingBudget;
  });
  if (!budgetUsageResult.success) {
    const { code, message } = handleError(budgetUsageResult.error);
    return error({ code, message });
  }

  const transactionUsingBudget = budgetUsageResult.data;
  if (transactionUsingBudget) {
    return error({
      code: 400,
      message: "Budget cannot be deleted as it is being used in transactions",
    });
  }

  const budgetDeletionResult = await tryCatch(() =>
    deleteBudgetQuery({ budgetId, userId }),
  );
  if (!budgetDeletionResult.success) {
    const { code, message } = handleError(budgetDeletionResult.error);
    return error({ code, message });
  }

  return success({ code: 200, message: "Budget deleted successfully" });
};

export const adjustBudgetForTransaction = async (
  userId: number,
  categoryId: number,
  date: Date,
  amount: number,
  status: "refunded" | "deducted",
) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const existingBudgetResult = await tryCatch(async () => {
    const [existingBudget] = await getExistingBudgetQuery({
      userId,
      category: categoryId,
      month,
      year,
    });

    return existingBudget;
  });
  if (!existingBudgetResult.success) {
    const { code, message } = handleError(existingBudgetResult.error);
    return error({ code, message });
  }

  const existingBudget = existingBudgetResult.data;
  if (!existingBudget)
    return error({ code: 404, message: "Budget not found" });

  const budgetAdjustmentResult = await tryCatch(async () => {
    const [budgetAdjustment] = await adjustBudgetQuery(
      userId,
      categoryId,
      month,
      year,
      amount,
      status,
    );

    return budgetAdjustment;
  });
  if (!budgetAdjustmentResult.success) {
    const { code, message } = handleError(budgetAdjustmentResult.error);
    return error({ code, message });
  }

  const budgetAdjustment = budgetAdjustmentResult.data;
  if (budgetAdjustment)
    return success({ code: 200, message: "Budget adjusted successfully" });

  if (!budgetAdjustment && status === "deducted") {
    return error({
      code: 400,
      message: "You don't have enough budget for this transaction",
    });
  }

  return error({
    code: 500,
    message: "Internal server error: Budget record missing or inconsistent.",
  });
};
