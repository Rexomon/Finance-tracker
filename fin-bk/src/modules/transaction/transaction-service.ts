import {
  error,
  success,
  tryCatch,
  handleError,
} from "../../utils/error-handler";

import { adjustBudgetForTransaction } from "../budget/budget-service";

import { getExistingCategoryQuery } from "../category/category-db";
import {
  getTransactionByIdQuery,
  listTransactionQuery,
  createTransactionQuery,
  updateTransactionQuery,
  deleteTransactionQuery,
  getTransactionSummaryQuery,
} from "./transaction-db";

import type {
  TTransactionList,
  TTransactionUserId,
  TTransactionCreate,
  TTransactionUpdate,
  TTransactionDelete,
} from "./transaction-types";

export const createTransactionService = async ({
  userId,
  category,
  amount,
  type,
  description,
  date,
}: TTransactionCreate) => {
  const existingCategoryResult = await tryCatch(async () => {
    const [existingCategory] = await getExistingCategoryQuery({
      categoryId: category,
      userId,
      matchMode: "equal",
    });

    return existingCategory;
  });
  if (!existingCategoryResult.success) {
    const { code, message } = handleError(existingCategoryResult.error);
    return error({ code, message });
  }

  const existingCategory = existingCategoryResult.data;
  if (!existingCategory) {
    return error({ code: 404, message: "Category not found" });
  }

  // Deduct budget limit if the transaction is an expense
  if (type === "expense") {
    const budgetDeductionResult = await adjustBudgetForTransaction(
      userId,
      category,
      date,
      amount,
      "deducted",
    );
    if (!budgetDeductionResult.success) {
      return error({
        code: budgetDeductionResult.error.code,
        message: budgetDeductionResult.error.message,
      });
    }
  }

  const transactionCreationInput = {
    category,
    amount,
    type,
    description,
    date,
  };

  const transactionCreationResult = await tryCatch(() =>
    createTransactionQuery(transactionCreationInput),
  );
  if (!transactionCreationResult.success) {
    const { code, message } = handleError(transactionCreationResult.error);
    return error({ code, message });
  }

  return success({ code: 201, message: "Transaction created successfully" });
};

export const listTransactionService = async ({
  userId,
  page,
  pageSize,
}: TTransactionList) => {
  const transactionListResult = await tryCatch(async () => {
    const transactionQueries = listTransactionQuery({ userId, page, pageSize });

    const [[transactionCountRow], transactionRows] = await Promise.all([
      transactionQueries.transactionCountQuery,
      transactionQueries.transactionListQuery,
    ]);

    return { transactionCountRow, transactionRows };
  });
  if (!transactionListResult.success) {
    const { code, message } = handleError(transactionListResult.error);
    return error({ code, message });
  }

  const { transactionCountRow, transactionRows } = transactionListResult.data;
  const totalCount = transactionCountRow.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 0;

  const transactions = transactionRows.map((transactionRow) => ({
    _id: transactionRow.transaction.id,
    category: {
      _id: transactionRow.category.id,
      categoryName: transactionRow.category.categoryName,
      type: transactionRow.category.type,
    },
    amount: transactionRow.transaction.amount,
    type: transactionRow.transaction.type,
    description: transactionRow.transaction.description,
    date: transactionRow.transaction.date,
    createdAt: transactionRow.transaction.createdAt,
    updatedAt: transactionRow.transaction.updatedAt,
  }));

  if (totalCount === 0 || page > totalPages) {
    return success({
      code: 200,
      message: "No transactions found, or you have not created any",
      transactions: {
        metadata: { totalCount, page, pageSize, totalPages },
        data: [],
      },
    });
  }

  return success({
    code: 200,
    message: "Transactions retrieved successfully",
    transactions: {
      metadata: { totalCount, page, pageSize, totalPages },
      data: transactions,
    },
  });
};

export const getTransactionSummaryService = async ({
  userId,
}: TTransactionUserId) => {
  const transactionSummaryResult = await tryCatch(async () => {
    const transactionSummaryQueries = getTransactionSummaryQuery({ userId });

    const [
      [currentMonthSummary],
      currentMonthExpenseByCategory,
      monthlyTrends,
      recentTransactionRows,
      currentMonthBudgetRows,
    ] = await Promise.all([
      transactionSummaryQueries.currentMonthSummaryQuery,
      transactionSummaryQueries.currentMonthExpenseByCategoryQuery,
      transactionSummaryQueries.monthlyTrendsQuery,
      transactionSummaryQueries.recentTransactionsQuery,
      transactionSummaryQueries.currentMonthBudgetsQuery,
    ]);

    return {
      currentMonthSummary,
      currentMonthExpenseByCategory,
      monthlyTrends,
      recentTransactionRows,
      currentMonthBudgetRows,
    };
  });
  if (!transactionSummaryResult.success) {
    const { code, message } = handleError(transactionSummaryResult.error);
    return error({ code, message });
  }

  const {
    currentMonthSummary,
    currentMonthExpenseByCategory,
    monthlyTrends,
    recentTransactionRows,
    currentMonthBudgetRows,
  } = transactionSummaryResult.data;

  const spentMap = new Map<number, number>();
  for (const categoryExpense of currentMonthExpenseByCategory) {
    spentMap.set(categoryExpense.categoryId, categoryExpense.totalAmount);
  }

  const budgetStatuses = currentMonthBudgetRows.map((budgetRow) => {
    const spent = spentMap.get(budgetRow.category.id) || 0;
    const originalLimit = (budgetRow.budget.limit || 0) + spent;

    return {
      _id: budgetRow.budget.id,
      category: {
        _id: budgetRow.category.id,
        categoryName: budgetRow.category.categoryName,
        type: budgetRow.category.type,
      },
      originalLimit: originalLimit,
      spentAmount: spent,
      remainingAmount: budgetRow.budget.limit,
      usagePercentage:
        originalLimit > 0 ? Math.min((spent / originalLimit) * 100, 100) : 0,
    };
  });

  const recentTransactions = recentTransactionRows.map((transactionRow) => ({
    _id: transactionRow.transaction.id,
    category: {
      _id: transactionRow.category.id,
      categoryName: transactionRow.category.categoryName,
      type: transactionRow.category.type,
    },
    amount: transactionRow.transaction.amount,
    type: transactionRow.transaction.type,
    description: transactionRow.transaction.description,
    date: transactionRow.transaction.date,
    createdAt: transactionRow.transaction.createdAt,
    updatedAt: transactionRow.transaction.updatedAt,
  }));

  const balance =
    currentMonthSummary.totalIncome - currentMonthSummary.totalExpense;

  const summary = {
    currentMonthSummary: {
      totalIncome: currentMonthSummary.totalIncome || 0,
      totalExpense: currentMonthSummary.totalExpense || 0,
      balance: balance,
    },
    expenseByCategory: currentMonthExpenseByCategory,
    monthlyTrends,
    recentTransactions,
    budgetStatus: budgetStatuses,
  };

  return success({
    code: 200,
    message: "Transactions summary retrieved successfully",
    summary,
  });
};

export const updateTransactionService = async ({
  transactionId,
  userId,
  category,
  amount,
  type,
  description,
  date,
}: TTransactionUpdate) => {
  const transactionUpdateValidationResult = await tryCatch(async () => {
    const [[existingTransaction], [existingCategory]] = await Promise.all([
      getTransactionByIdQuery({
        transactionId,
        userId,
      }),
      getExistingCategoryQuery({
        categoryId: category,
        userId,
        matchMode: "equal",
      }),
    ]);

    return { existingTransaction, existingCategory };
  });
  if (!transactionUpdateValidationResult.success) {
    const { code, message } = handleError(
      transactionUpdateValidationResult.error,
    );
    return error({ code, message });
  }

  const { existingTransaction, existingCategory } =
    transactionUpdateValidationResult.data;
  if (!existingTransaction) {
    return error({ code: 404, message: "Transaction not found" });
  }
  if (!existingCategory) {
    return error({ code: 404, message: "Category not found" });
  }

  const oldType = existingTransaction.type;
  const newType = type;

  // Return budget limit if the old transaction is an expense
  if (oldType === "expense") {
    const budgetRefundResult = await adjustBudgetForTransaction(
      userId,
      existingTransaction.categoryId,
      existingTransaction.date,
      existingTransaction.amount,
      "refunded",
    );
    if (!budgetRefundResult.success) {
      return error({
        code: budgetRefundResult.error.code,
        message: budgetRefundResult.error.message,
      });
    }
  }

  // Deduct budget limit if the new transaction is an expense
  if (newType === "expense") {
    const budgetDeductionResult = await adjustBudgetForTransaction(
      userId,
      category,
      date,
      amount,
      "deducted",
    );

    if (!budgetDeductionResult.success) {
      // Deduction failed. Revert the previous budget adjustment.
      if (oldType === "expense") {
        const budgetRollbackResult = await adjustBudgetForTransaction(
          userId,
          existingTransaction.categoryId,
          existingTransaction.date,
          existingTransaction.amount,
          "deducted",
        );
        if (!budgetRollbackResult.success) {
          return error({
            code: budgetRollbackResult.error.code,
            message: budgetRollbackResult.error.message,
          });
        }
      }

      return error({
        code: budgetDeductionResult.error.code,
        message: budgetDeductionResult.error.message,
      });
    }
  }

  const transactionUpdateInput = {
    category,
    amount,
    type,
    description,
    date,
  };

  const transactionUpdateResult = await tryCatch(() =>
    updateTransactionQuery({
      transactionId,
      userId,
      ...transactionUpdateInput,
    }),
  );
  if (!transactionUpdateResult.success) {
    const { code, message } = handleError(transactionUpdateResult.error);
    return error({ code, message });
  }

  return success({
    code: 200,
    message: "Transaction updated successfully",
  });
};

export const deleteTransactionService = async ({
  transactionId,
  userId,
}: TTransactionDelete) => {
  const existingTransactionResult = await tryCatch(async () => {
    const [existingTransaction] = await getTransactionByIdQuery({
      transactionId,
      userId,
    });

    return existingTransaction;
  });
  if (!existingTransactionResult.success) {
    return error({ code: 404, message: "Transaction not found" });
  }

  const existingTransaction = existingTransactionResult.data;
  if (existingTransaction.type === "expense") {
    const budgetRefundResult = await adjustBudgetForTransaction(
      userId,
      existingTransaction.categoryId,
      existingTransaction.date,
      existingTransaction.amount,
      "refunded",
    );

    if (!budgetRefundResult.success) {
      return error({
        code: budgetRefundResult.error.code,
        message: budgetRefundResult.error.message,
      });
    }
  }

  const transactionDeletionResult = await tryCatch(() =>
    deleteTransactionQuery({
      transactionId,
      userId,
    }),
  );
  if (!transactionDeletionResult.success) {
    const { code, message } = handleError(transactionDeletionResult.error);
    return error({ code, message });
  }

  return success({
    code: 200,
    message: "Transaction deleted successfully",
    deletedType: existingTransaction.type,
  });
};
