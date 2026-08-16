import { and, count, desc, eq, inArray, gte, lt, sql } from "drizzle-orm";

import db from "../../Database/db-connection";

import { budget } from "../../Model/Budget/budget-model";
import { category } from "../../Model/Category/category-model";
import { transaction } from "../../Model/Transaction/transaction-model";

import type {
  TTransaction,
  TTransactionList,
  TTransactionExist,
  TTransactionUpdate,
  TTransactionDelete,
  TTransactionUserId,
  TTransactionById,
  TTransactionByCategory,
} from "./transaction-types";

export function getExistingTransactionQuery({
  userId,
  category: categoryId,
  month,
  year,
}: TTransactionExist) {
  const startOfDate = new Date(year, month - 1, 1);
  const endOfDate = new Date(year, month, 1);

  return db
    .select()
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(
      and(
        eq(category.userId, userId),
        eq(transaction.category, categoryId),
        gte(transaction.date, startOfDate),
        lt(transaction.date, endOfDate),
      ),
    )
    .limit(1);
}

export function getTransactionByIdQuery({
  transactionId,
  userId,
}: TTransactionById) {
  return db
    .select({
      id: transaction.id,
      categoryId: transaction.category,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      date: transaction.date,
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(and(eq(category.userId, userId), eq(transaction.id, transactionId)))
    .limit(1);
}

export function getTransactionByCategoryQuery({
  userId,
  category: categoryId,
}: TTransactionByCategory) {
  return db
    .select({ id: transaction.id })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(
      and(eq(category.userId, userId), eq(transaction.category, categoryId)),
    )
    .limit(1);
}

export function listTransactionQuery({
  userId,
  page,
  pageSize,
}: TTransactionList) {
  const transactionCountQuery = db
    .select({ totalCount: count(transaction.id) })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(eq(category.userId, userId));

  const transactionListQuery = db
    .select({
      category: {
        id: category.id,
        categoryName: category.categoryName,
        type: category.type,
      },
      transaction: transaction,
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(eq(category.userId, userId))
    .orderBy(desc(transaction.date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { transactionCountQuery, transactionListQuery };
}

export function getTransactionSummaryQuery({ userId }: TTransactionUserId) {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const sixMonthsAgoDate = new Date(year, month - 6, 1);

  const currentMonthSummaryQuery = db
    .select({
      totalIncome:
        sql<number>`COALESCE(SUM(CASE WHEN ${transaction.type} = 'income' THEN ${transaction.amount} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
      totalExpense:
        sql<number>`COALESCE(SUM(CASE WHEN ${transaction.type} = 'expense' THEN ${transaction.amount} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(
      and(
        eq(category.userId, userId),
        gte(transaction.date, startDate),
        lt(transaction.date, endDate),
      ),
    );

  const currentMonthExpenseByCategoryQuery = db
    .select({
      categoryId: category.id,
      categoryName: category.categoryName,
      totalAmount:
        sql<number>`COALESCE(SUM(CASE WHEN ${transaction.type} = 'expense' THEN ${transaction.amount} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(
      and(
        eq(category.userId, userId),
        eq(transaction.type, "expense"),
        gte(transaction.date, startDate),
        lt(transaction.date, endDate),
      ),
    )
    .groupBy(category.id);

  // Monthly trends for the past 6 months
  const monthlyTrendsQuery = db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${transaction.date})`.mapWith(
        Number,
      ),
      year: sql<number>`EXTRACT(YEAR FROM ${transaction.date})`.mapWith(Number),
      totalIncome:
        sql<number>`COALESCE(SUM(CASE WHEN ${transaction.type} = 'income' THEN ${transaction.amount} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
      totalExpense:
        sql<number>`COALESCE(SUM(CASE WHEN ${transaction.type} = 'expense' THEN ${transaction.amount} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(
      and(
        eq(category.userId, userId),
        gte(transaction.date, sixMonthsAgoDate),
        lt(transaction.date, endDate),
      ),
    )
    .groupBy(
      sql`${sql<number>`EXTRACT(YEAR FROM ${transaction.date})`}, ${sql<number>`EXTRACT(MONTH FROM ${transaction.date})`}`,
    );

  const recentTransactionsQuery = db
    .select({
      transaction: transaction,
      category: {
        id: category.id,
        categoryName: category.categoryName,
        type: category.type,
      },
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(eq(category.userId, userId))
    .orderBy(desc(transaction.date))
    .limit(10);

  const currentMonthBudgetsQuery = db
    .select()
    .from(budget)
    .innerJoin(category, eq(budget.category, category.id))
    .where(
      and(
        eq(category.userId, userId),
        eq(budget.month, month),
        eq(budget.year, year),
      ),
    );

  return {
    currentMonthSummaryQuery,
    currentMonthExpenseByCategoryQuery,
    monthlyTrendsQuery,
    recentTransactionsQuery,
    currentMonthBudgetsQuery,
  };
}

export function updateTransactionQuery({
  transactionId,
  userId,
  category: categoryId,
  amount,
  type,
  description,
  date,
}: TTransactionUpdate) {
  return db
    .update(transaction)
    .set({
      category: categoryId,
      amount,
      type,
      description,
      date,
    })
    .where(
      and(
        eq(transaction.id, transactionId),
        inArray(
          transaction.category,
          db
            .select({ id: category.id })
            .from(category)
            .where(eq(category.userId, userId)),
        ),
      ),
    );
}

export function deleteTransactionQuery({
  transactionId,
  userId,
}: TTransactionDelete) {
  return db
    .delete(transaction)
    .where(
      and(
        eq(transaction.id, transactionId),
        inArray(
          transaction.category,
          db
            .select({ id: category.id })
            .from(category)
            .where(eq(category.userId, userId)),
        ),
      ),
    );
}

export function createTransactionQuery(data: TTransaction) {
  return db.insert(transaction).values(data);
}
