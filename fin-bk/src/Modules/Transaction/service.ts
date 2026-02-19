import Redis from "../../Config/Redis";

import { handleError } from "../../Utils/ErrorHandling";
import {
  invalidateUserBudgetCache,
  invalidateUserTransactionCache,
} from "../../Utils/RedisCache";

import { categoryQueryFindOne } from "../Category/db";
import { budgetQueryExists } from "../Budget/db";

import { adjustBudgetForTransaction } from "../Budget/service";

import {
  createNewTransaction,
  transactionQueryFind,
  transactionQueryUpdate,
  transactionQueryDelete,
  transactionQueryFindOne,
  transactionQuerySummary,
} from "./db";

import type {
  TTransaction,
  TTransactionId,
  TTransactionUserId,
  TTransactionPagination,
} from "./types";

export const transactionCreate = async (
  { userId }: TTransactionUserId,
  { category, amount, type, description, date }: TTransaction,
) => {
  try {
    const existingCategory = await categoryQueryFindOne({
      _id: category,
      userId,
    });
    if (!existingCategory || existingCategory.type !== type) {
      return { code: 404, message: "Category not found" };
    }

    // Deduct budget limit if the transaction is an expense
    if (type === "expense") {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const existingBudget = await budgetQueryExists({
        userId: userId,
        category: category,
        month: month,
        year: year,
      });
      if (!existingBudget) {
        return {
          code: 400,
          message: "Please create a budget for this category first",
        };
      }

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
      userId,
      category,
      amount,
      type,
      description,
      date,
    };

    await createNewTransaction(transactionData);

    const cacheKeysToDelete = [
      invalidateUserTransactionCache(userId),
      Redis.del(`transaction_summary:${userId}`),
    ];
    if (type === "expense") {
      cacheKeysToDelete.push(invalidateUserBudgetCache(userId));
    }

    await Promise.all(cacheKeysToDelete);

    return {
      code: 201,
      message: "Transaction created successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionList = async ({
  userId,
  page,
  pageSize,
}: TTransactionUserId & TTransactionPagination) => {
  try {
    const cacheKey = `transactions:${userId}:${page}:${pageSize}`;

    const cachedTransactions = await Redis.get(cacheKey);
    if (cachedTransactions) {
      return {
        code: 200,
        message: "Transactions retrieved successfully",
        transactions: JSON.parse(cachedTransactions),
      };
    }

    const transactions = await transactionQueryFind(userId, page, pageSize);
    if (
      transactions.metadata.totalCount === 0 ||
      page > transactions.metadata.totalPages
    ) {
      return {
        code: 200,
        message: "No transactions found, or you have not created any",
        transactions: { metadata: transactions.metadata, data: [] },
      };
    }

    await Redis.set(cacheKey, JSON.stringify(transactions), "EX", 1800);

    return {
      code: 200,
      message: "Transactions retrieved successfully",
      transactions,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionSummary = async ({ userId }: TTransactionUserId) => {
  try {
    const cacheKey = `transaction_summary:${userId}`;

    const cachedSummary = await Redis.get(cacheKey);
    if (cachedSummary) {
      return {
        code: 200,
        message: "Transactions summary retrieved successfully",
        summary: JSON.parse(cachedSummary),
      };
    }

    const summary = await transactionQuerySummary(userId);

    await Redis.set(cacheKey, JSON.stringify(summary), "EX", 1800);

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

export const transactionUpdate = async (
  { userId }: TTransactionUserId,
  { transactionId }: TTransactionId,
  { category, amount, type, description, date }: TTransaction,
) => {
  try {
    const [existingTransaction, newCategory] = await Promise.all([
      transactionQueryFindOne({
        _id: transactionId,
        userId,
      }),
      categoryQueryFindOne({
        _id: category,
        userId,
      }),
    ]);

    if (!existingTransaction) {
      return { code: 404, message: "Transaction not found" };
    }
    if (!newCategory || newCategory.type !== type) {
      return { code: 404, message: "Category not found" };
    }

    const oldType = existingTransaction.type;
    const newType = type;

    // Return budget limit if the old transaction is an expense
    if (oldType === "expense") {
      const returnResult = await adjustBudgetForTransaction(
        userId,
        existingTransaction.category.toString(),
        existingTransaction.date,
        existingTransaction.amount,
        "returned",
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
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const existingBudget = await budgetQueryExists({
        userId: userId,
        category: category,
        month: month,
        year: year,
      });
      if (!existingBudget) {
        return {
          code: 400,
          message: "Please create a budget for this category first",
        };
      }

      const deductResult = await adjustBudgetForTransaction(
        userId,
        category,
        date,
        amount,
        "deducted",
      );

      if (deductResult.code !== 200) {
        // Deduction failed (e.g., insufficient budget). We must revert the previous budget adjustment.
        if (oldType === "expense") {
          const reDeductResult = await adjustBudgetForTransaction(
            userId,
            existingTransaction.category.toString(),
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

    await transactionQueryUpdate(
      { _id: transactionId, userId },
      updatedTransaction,
    );

    const cacheKeysToDelete = [
      invalidateUserBudgetCache(userId),
      invalidateUserTransactionCache(userId),
      Redis.del(`transaction_summary:${userId}`),
    ];

    await Promise.all(cacheKeysToDelete);

    return {
      code: 200,
      message: "Transaction updated successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const transactionDelete = async (
  { userId }: TTransactionUserId,
  { transactionId }: TTransactionId,
) => {
  try {
    const existingTransaction = await transactionQueryFindOne({
      _id: transactionId,
      userId,
    });
    if (!existingTransaction) {
      return { code: 404, message: "Transaction not found" };
    }

    if (existingTransaction.type === "expense") {
      const returnResult = await adjustBudgetForTransaction(
        userId,
        existingTransaction.category.toString(),
        existingTransaction.date,
        existingTransaction.amount,
        "returned",
      );

      if (returnResult.code !== 200) {
        return {
          code: returnResult.code,
          message: returnResult.message,
        };
      }
    }

    await transactionQueryDelete({
      transactionId,
      userId,
    });

    const cacheKeysToDelete = [
      invalidateUserTransactionCache(userId),
      Redis.del(`transaction_summary:${userId}`),
    ];
    if (existingTransaction.type === "expense") {
      cacheKeysToDelete.push(invalidateUserBudgetCache(userId));
    }

    await Promise.all(cacheKeysToDelete);

    return {
      code: 200,
      message: "Transaction deleted successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
