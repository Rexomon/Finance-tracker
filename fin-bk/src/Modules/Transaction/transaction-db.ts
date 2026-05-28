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

export function getExistingTransaction({
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

export function getTransactionById({
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

export function getTransactionByCategory({
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

export function transactionListQuery({
  userId,
  page,
  pageSize,
}: TTransactionList) {
  const totalCount = db
    .select({ totalCount: count(transaction.id) })
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(eq(category.userId, userId));

  const dataResult = db
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

  return { totalCount, dataResult };
}

export function transactionSummaryQuery({ userId }: TTransactionUserId) {
  const d = new Date();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const sixMonthsAgoDate = new Date(year, month - 6, 1);

  const currentMonthSummary = db
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

  const currentMonthExpenseByCategory = db
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
  const monthlyTrends = db
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

  const recentTransactions = db
    .select()
    .from(transaction)
    .innerJoin(category, eq(transaction.category, category.id))
    .where(eq(category.userId, userId))
    .orderBy(desc(transaction.date))
    .limit(10);

  const currentMonthBudgets = db
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
    currentMonthSummary,
    currentMonthExpenseByCategory,
    monthlyTrends,
    recentTransactions,
    currentMonthBudgets,
  };
}

export function transactionUpdateQuery({
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

export function transactionDeleteQuery({
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

export function transactionCreateQuery(data: TTransaction) {
  return db.insert(transaction).values(data);
}
