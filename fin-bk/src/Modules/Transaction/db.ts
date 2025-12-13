import { Types } from "mongoose";

import TransactionModel from "../../Model/TransactionModel";
import BudgetModel from "../../Model/BudgetModel";

import type {
  TTransactionDBQuery,
  TTransactionDBCreate,
  TTransactionDBDelete,
  TTransactionDBUpdate,
  TTransactionAggregate,
  TMonthlyTrendsAggregate,
  TExpenseByCategoryAggregate,
  TCurrentMonthSummaryAggregate,
} from "./types";

export const transactionQueryExists = (filter: TTransactionDBQuery) => {
  return TransactionModel.exists(filter);
};

export const transactionQueryFindOne = (filter: TTransactionDBQuery) => {
  return TransactionModel.findOne(filter, {
    userId: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  }).lean();
};

export const transactionQueryFind = async (
  userId: string,
  page: number,
  pageSize: number,
) => {
  const results = await TransactionModel.aggregate<TTransactionAggregate>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $sort: { date: -1 } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userId: 0,
              __v: 0,
              "category.userId": 0,
              "category.createdAt": 0,
              "category.updatedAt": 0,
              "category.__v": 0,
            },
          },
        ],

        metadata: [{ $count: "totalCount" }],
      },
    },
  ]);

  const data = results[0].data || [];
  const totalCount = results[0].metadata[0]?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 0;

  return { metadata: { totalCount, page, pageSize, totalPages }, data };
};

export const transactionQuerySummary = async (userId: string) => {
  const d = new Date();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const userObjectId = new Types.ObjectId(userId);

  // Current month summary
  const currMonthSummaryPromise =
    TransactionModel.aggregate<TCurrentMonthSummaryAggregate>([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpense: 1,
        },
      },
    ]);

  // Expense by category for the current month
  const expenseByCategoryPromise =
    TransactionModel.aggregate<TExpenseByCategoryAggregate>([
      {
        $match: {
          userId: userObjectId,
          type: "expense",
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$category._id",
          categoryName: "$category.categoryName",
          totalAmount: 1,
        },
      },
    ]);

  // Monthly trends for the past 6 months
  const sixMonthsAgoDate = new Date(year, month - 6, 1);

  const monthlyTrendsPromise =
    TransactionModel.aggregate<TMonthlyTrendsAggregate>([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: sixMonthsAgoDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          totalIncome: 1,
          totalExpense: 1,
        },
      },
    ]);

  // Recent 10 transactions
  const recentTransactionsPromise = TransactionModel.find(
    { userId: userObjectId },
    { userId: 0, createdAt: 0, updatedAt: 0, __v: 0 },
  )
    .populate("category", { userId: 0, createdAt: 0, updatedAt: 0, __v: 0 })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  // Budget status for the current month
  const budgetsPromise = BudgetModel.find(
    { userId: userObjectId, month, year },
    { userId: 0, createdAt: 0, updatedAt: 0, __v: 0 },
  )
    .populate("category", { userId: 0, createdAt: 0, updatedAt: 0, __v: 0 })
    .lean();

  const [
    currMonthSummary,
    expenseByCategory,
    monthlyTrends,
    recentTransactions,
    rawBudgets,
  ] = await Promise.all([
    currMonthSummaryPromise,
    expenseByCategoryPromise,
    monthlyTrendsPromise,
    recentTransactionsPromise,
    budgetsPromise,
  ]);

  const totalIncome = currMonthSummary[0]?.totalIncome || 0;
  const totalExpense = currMonthSummary[0]?.totalExpense || 0;
  const balance = totalIncome - totalExpense;

  const budgets = rawBudgets.filter((b) => b.category !== null);

  // Sort monthly trends by year and month in ascending order
  const monthlyTrendsSorted = monthlyTrends.sort((a, b) => {
    if (a.year === b.year) {
      return a.month - b.month;
    }
    return a.year - b.year;
  });

  // Build a map from category ID to spent amount
  const spentMap = new Map<string, number>();
  for (const entry of expenseByCategory) {
    spentMap.set(String(entry.categoryId), entry.totalAmount);
  }

  const budgetStatus = budgets.map((budget) => {
    const spentAmount = spentMap.get(String(budget.category._id)) || 0;
    const originalLimit = budget.limit + spentAmount || 0;

    return {
      _id: budget._id,
      category: budget.category,
      originalLimit: originalLimit,
      spentAmount: spentAmount,
      remainingAmount: Math.max(originalLimit - spentAmount, 0),
      usagePercentage:
        originalLimit > 0 ? (spentAmount / originalLimit) * 100 : 0,
    };
  });

  return {
    currentMonthSummary: { totalIncome, totalExpense, balance },
    expenseByCategory: expenseByCategory,
    monthlyTrends: monthlyTrendsSorted,
    recentTransactions,
    budgetStatus,
  };
};

export const transactionQueryDelete = ({
  transactionId,
  userId,
}: TTransactionDBDelete) => {
  return TransactionModel.findOneAndDelete(
    {
      _id: transactionId,
      userId,
    },
    { projection: { userId: 0, __v: 0 } },
  ).lean();
};

export const transactionQueryUpdate = (
  filter: TTransactionDBQuery,
  transactionData: TTransactionDBUpdate,
) => {
  return TransactionModel.findOneAndUpdate(filter, transactionData, {
    projection: { userId: 0, __v: 0 },
    new: true,
  }).lean();
};

export const createNewTransaction = (transactionData: TTransactionDBCreate) => {
  return TransactionModel.create(transactionData);
};
