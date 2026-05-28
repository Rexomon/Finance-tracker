import { handleError } from "../../Utils/ErrorHandling";

import { adjustBudgetForTransaction } from "../Budget/budget-service";

import { getExistingCategory } from "../Category/category-db";
import {
  getTransactionById,
  transactionListQuery,
  transactionCreateQuery,
  transactionUpdateQuery,
  transactionDeleteQuery,
  transactionSummaryQuery,
} from "./transaction-db";

import type {
  TTransactionList,
  TTransactionUserId,
  TTransactionCreate,
  TTransactionUpdate,
  TTransactionDelete,
} from "./transaction-types";

export const transactionCreateService = async ({
  userId,
  category,
  amount,
  type,
  description,
  date,
}: TTransactionCreate) => {
  try {
    const [existingCategory] = await getExistingCategory({
      categoryId: category,
      userId,
      filter: "equal",
    });
    if (!existingCategory) {
      return { code: 404, message: "Category not found" };
    }

    // Deduct budget limit if the transaction is an expense
    if (type === "expense") {
      const deductBudgetLimit = await adjustBudgetForTransaction(
        userId,
        category,
        date,
        amount,
        "deducted",
      );
      if (deductBudgetLimit.code !== 200) {
        return {
          code: deductBudgetLimit.code,
          message: deductBudgetLimit.message,
        };
      }
    }

    const transactionData = {
      category,
      amount,
      type,
      description,
      date,
    };

    await transactionCreateQuery(transactionData);

    return {
      code: 201,
      message: "Transaction created successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionListService = async ({
  userId,
  page,
  pageSize,
}: TTransactionList) => {
  try {
    const queries = transactionListQuery({ userId, page, pageSize });
    const [countResult, dataResult] = await Promise.all([
      queries.totalCount,
      queries.dataResult,
    ]);

    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 0;

    const transactions = dataResult.map((item) => ({
      _id: item.transaction.id,
      category: item.category,
      amount: item.transaction.amount,
      type: item.transaction.type,
      description: item.transaction.description,
      date: item.transaction.date,
      createdAt: item.transaction.createdAt,
      updatedAt: item.transaction.updatedAt,
    }));

    if (totalCount === 0 || page > totalPages) {
      return {
        code: 200,
        message: "No transactions found, or you have not created any",
        transactions: {
          metadata: { totalCount, page, pageSize, totalPages },
          data: [],
        },
      };
    }

    return {
      code: 200,
      message: "Transactions retrieved successfully",
      transactions: {
        metadata: { totalCount, page, pageSize, totalPages },
        data: transactions,
      },
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionSummaryService = async ({
  userId,
}: TTransactionUserId) => {
  try {
    const queries = transactionSummaryQuery({ userId });

    const [
      [currMonthSummary],
      currMonthExpenseByCategory,
      monthlyTrends,
      recTransaction,
      budgets,
    ] = await Promise.all([
      queries.currentMonthSummary,
      queries.currentMonthExpenseByCategory,
      queries.monthlyTrends,
      queries.recentTransactions,
      queries.currentMonthBudgets,
    ]);

    const spentMap = new Map<number, number>();
    for (const crgr of currMonthExpenseByCategory) {
      spentMap.set(crgr.categoryId, crgr.totalAmount);
    }

    const budgetStatus = budgets.map((bgt) => {
      const spent = spentMap.get(bgt.category.id) || 0;
      const originalLimit = (bgt.budget.limit || 0) + spent;

      return {
        _id: bgt.budget.id,
        category: {
          _id: bgt.category.id,
          categoryName: bgt.category.categoryName,
          type: bgt.category.type,
        },
        originalLimit: originalLimit,
        spentAmount: spent,
        remainingAmount: bgt.budget.limit,
        usagePercentage:
          originalLimit > 0 ? Math.min((spent / originalLimit) * 100, 100) : 0,
      };
    });

    const recentTransactions = recTransaction.map((tx) => ({
      _id: tx.transaction.id,
      category: {
        _id: tx.category.id,
        categoryName: tx.category.categoryName,
        type: tx.category.type,
      },
      amount: tx.transaction.amount,
      type: tx.transaction.type,
      description: tx.transaction.description,
      date: tx.transaction.date,
      createdAt: tx.transaction.createdAt,
      updatedAt: tx.transaction.updatedAt,
    }));

    const balance =
      currMonthSummary.totalIncome - currMonthSummary.totalExpense;

    const summary = {
      currentMonthSummary: {
        totalIncome: currMonthSummary.totalIncome || 0,
        totalExpense: currMonthSummary.totalExpense || 0,
        balance: balance,
      },
      expenseByCategory: currMonthExpenseByCategory,
      monthlyTrends,
      recentTransactions,
      budgetStatus,
    };

    return {
      code: 200,
      message: "Transactions summary retrieved successfully",
      summary,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionUpdateService = async ({
  transactionId,
  userId,
  category,
  amount,
  type,
  description,
  date,
}: TTransactionUpdate) => {
  try {
    const [[existingTransaction], [existingCategory]] = await Promise.all([
      getTransactionById({
        transactionId,
        userId,
      }),
      getExistingCategory({
        categoryId: category,
        userId,
        filter: "equal",
      }),
    ]);

    if (!existingTransaction) {
      return { code: 404, message: "Transaction not found" };
    }
    if (!existingCategory) {
      return { code: 404, message: "Category not found" };
    }

    const oldType = existingTransaction.type;
    const newType = type;

    // Return budget limit if the old transaction is an expense
    if (oldType === "expense") {
      const returnResult = await adjustBudgetForTransaction(
        userId,
        existingTransaction.categoryId,
        existingTransaction.date,
        existingTransaction.amount,
        "refunded",
      );
      if (returnResult.code !== 200) {
        return {
          code: returnResult.code,
          message: returnResult.message,
        };
      }
    }

    // Deduct budget limit if the new transaction is an expense
    if (newType === "expense") {
      const deductResult = await adjustBudgetForTransaction(
        userId,
        category,
        date,
        amount,
        "deducted",
      );

      if (deductResult.code !== 200) {
        // Deduction failed. Revert the previous budget adjustment.
        if (oldType === "expense") {
          const reDeductResult = await adjustBudgetForTransaction(
            userId,
            existingTransaction.categoryId,
            existingTransaction.date,
            existingTransaction.amount,
            "deducted",
          );
          if (reDeductResult.code !== 200) {
            return {
              code: reDeductResult.code,
              message: reDeductResult.message,
            };
          }
        }

        return {
          code: deductResult.code,
          message: deductResult.message,
        };
      }
    }

    const updatedTransaction = {
      category,
      amount,
      type,
      description,
      date,
    };

    await transactionUpdateQuery({
      transactionId,
      userId,
      ...updatedTransaction,
    });

    return {
      code: 200,
      message: "Transaction updated successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionDeleteService = async ({
  transactionId,
  userId,
}: TTransactionDelete) => {
  try {
    const [existingTransaction] = await getTransactionById({
      transactionId,
      userId,
    });
    if (!existingTransaction) {
      return { code: 404, message: "Transaction not found" };
    }

    if (existingTransaction.type === "expense") {
      const returnResult = await adjustBudgetForTransaction(
        userId,
        existingTransaction.categoryId,
        existingTransaction.date,
        existingTransaction.amount,
        "refunded",
      );

      if (returnResult.code !== 200) {
        return {
          code: returnResult.code,
          message: returnResult.message,
        };
      }
    }

    await transactionDeleteQuery({
      transactionId,
      userId,
    });

    return {
      code: 200,
      message: "Transaction deleted successfully",
      deletedType: existingTransaction.type,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
