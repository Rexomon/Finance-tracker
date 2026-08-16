import { and, eq, ne, desc } from "drizzle-orm";

import db from "../../Database/db-connection";

import { category } from "../../Model/Category/category-model";

import type {
  TCategoryCreate,
  TCategoryOptional,
  TCategoryListQuery,
  TCategoryExistQuery,
  TCategoryUpdateQuery,
  TCategoryDeleteQuery,
} from "./category-types";

export function getExistingCategoryQuery({
  categoryId,
  userId,
  categoryName,
  matchMode,
}: TCategoryExistQuery & { matchMode?: "notEqual" | "equal" }) {
  const conditions = [eq(category.userId, userId)];

  if (categoryId && matchMode === "notEqual")
    conditions.push(ne(category.id, categoryId));
  if (categoryId && matchMode === "equal")
    conditions.push(eq(category.id, categoryId));

  if (categoryName) conditions.push(eq(category.categoryName, categoryName));

  return db
    .select({ categoryName: category.categoryName, type: category.type })
    .from(category)
    .where(and(...conditions))
    .limit(1);
}

export function createCategoryQuery({
  userId,
  categoryName,
  type,
}: TCategoryCreate) {
  return db.insert(category).values({ userId, categoryName, type });
}

export function listCategoryQuery({ userId, type }: TCategoryListQuery) {
  const conditions = [eq(category.userId, userId)];

  if (type) conditions.push(eq(category.type, type));

  return db
    .select({
      _id: category.id,
      categoryName: category.categoryName,
      type: category.type,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    })
    .from(category)
    .where(and(...conditions))
    .orderBy(desc(category.createdAt));
}

export function updateCategoryQuery({
  categoryId,
  userId,
  categoryName,
  type,
}: TCategoryUpdateQuery) {
  const categoryUpdates: TCategoryOptional = {};
  if (categoryName) categoryUpdates.categoryName = categoryName;
  if (type) categoryUpdates.type = type;

  return db
    .update(category)
    .set(categoryUpdates)
    .where(and(eq(category.id, categoryId), eq(category.userId, userId)));
}

export function deleteCategoryQuery({
  categoryId,
  userId,
}: TCategoryDeleteQuery) {
  return db
    .delete(category)
    .where(and(eq(category.id, categoryId), eq(category.userId, userId)))
    .returning({ type: category.type });
}
