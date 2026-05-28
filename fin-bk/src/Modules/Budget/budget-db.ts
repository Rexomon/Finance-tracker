import { and, count, desc, eq, ne, inArray, sql, gte } from "drizzle-orm";

import db from "../../Database/db-connection";

import { budget } from "../../Model/Budget/budget-model";
import { category } from "../../Model/Category/category-model";

import type {
  TBudgetList,
  TBudgetExist,
  TBudgetUpdate,
  TBudgetDelete,
  TBudgetCreateQuery,
  TBudgetByCategory,
} from "./budget-types";

export function getExistingBudget({
  budgetId,
  userId,
  category: categoryId,
  month,
  year,
  filter,
}: TBudgetExist & { filter?: "notEqual" | "equal" }) {
  const conditions = [eq(category.userId, userId)];

  if (budgetId && filter === "notEqual")
    conditions.push(ne(budget.id, budgetId));
  if (budgetId && filter === "equal") conditions.push(eq(budget.id, budgetId));

  if (categoryId) conditions.push(eq(category.id, categoryId));
  if (month) conditions.push(eq(budget.month, month));
  if (year) conditions.push(eq(budget.year, year));

  return db
    .select({
      id: budget.id,
      categoryId: budget.category,
      categoryName: category.categoryName,
      type: category.type,
      limit: budget.limit,
      month: budget.month,
      year: budget.year,
    })
    .from(budget)
    .innerJoin(category, eq(budget.category, category.id))
    .where(and(...conditions))
    .limit(1);
}

export function getBudgetByCategory({
  userId,
  category: categoryId,
}: TBudgetByCategory) {
  return db
    .select({ id: budget.id })
    .from(budget)
    .innerJoin(category, eq(budget.category, category.id))
    .where(and(eq(category.userId, userId), eq(budget.category, categoryId)))
    .limit(1);
}

export function budgetUpdateQuery({
  budgetId,
  userId,
  category: categoryId,
  limit,
  month,
  year,
}: TBudgetUpdate) {
  const sets: Omit<TBudgetUpdate, "budgetId" | "userId"> = {};
  const conditions = [
    eq(budget.id, budgetId),
    inArray(
      budget.category,
      db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.userId, userId)),
    ),
  ];

  if (categoryId) sets.category = categoryId;
  if (limit) sets.limit = limit;
  if (month) sets.month = month;
  if (year) sets.year = year;

  return db
    .update(budget)
    .set(sets)
    .where(and(...conditions));
}

export function budgetListQuery({
  userId,
  page,
  pageSize,
  month,
  year,
}: TBudgetList) {
  const conditions = [eq(category.userId, userId)];

  if (month) conditions.push(eq(budget.month, month));
  if (year) conditions.push(eq(budget.year, year));

  const totalCount = db
    .select({ totalCount: count(budget.id) })
    .from(budget)
    .innerJoin(category, eq(budget.category, category.id))
    .where(and(...conditions));

  const dataResult = db
    .select()
    .from(budget)
    .innerJoin(category, eq(budget.category, category.id))
    .where(and(...conditions))
    .orderBy(desc(budget.year), desc(budget.month))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { totalCount, dataResult };
}

export function budgetDeleteQuery({ budgetId, userId }: TBudgetDelete) {
  return db
    .delete(budget)
    .where(
      and(
        eq(budget.id, budgetId),
        inArray(
          budget.category,
          db
            .select({ id: category.id })
            .from(category)
            .where(eq(category.userId, userId)),
        ),
      ),
    );
}

export function budgetCreateQuery(data: TBudgetCreateQuery) {
  return db.insert(budget).values(data);
}

export function adjustBudgetQuery(
  userId: number,
  categoryId: number,
  month: number,
  year: number,
  amount: number,
  status: "refunded" | "deducted",
) {
  const limitAdjustment =
    status === "deducted"
      ? sql<number>`${budget.limit} - ${amount}`
      : sql<number>`${budget.limit} + ${amount}`;

  const conditions = [
    eq(budget.category, categoryId),
    eq(budget.month, month),
    eq(budget.year, year),
    inArray(
      budget.category,
      db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.userId, userId)),
    ),
  ];

  if (status === "deducted") conditions.push(gte(budget.limit, amount));

  return db
    .update(budget)
    .set({ limit: limitAdjustment })
    .where(and(...conditions))
    .returning({ id: budget.id, limit: budget.limit });
}
