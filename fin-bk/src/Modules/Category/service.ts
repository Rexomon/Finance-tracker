import Redis from "../../Config/Redis";

import { handleError } from "../../Utils/ErrorHandling";
import {
  invalidateUserBudgetCache,
  invalidateUserTransactionCache,
} from "../../Utils/RedisCache";

import { budgetQueryExists } from "../Budget/db";
import { transactionQueryExists } from "../Transaction/db";
import {
  createNewCategory,
  categoryQueryFind,
  categoryQueryExists,
  categoryQueryDelete,
  categoryQueryUpdate,
  categoryQueryFindOne,
} from "./db";

import type {
  TCategory,
  TCategoryId,
  TCategoryUserId,
  TCategoryOptional,
  TCategoryQueryList,
} from "./types";

const CATEGORIES_PREFIX = "categories:";

export const categoryCreate = async ({
  userId,
  categoryName,
  type,
}: TCategoryUserId & TCategory) => {
  try {
    const categoryData = { userId, categoryName, type };

    const cacheKeysToDelete = [
      `${CATEGORIES_PREFIX}${userId}`,
      `${CATEGORIES_PREFIX}${userId}:${type}`,
    ];

    const existingCategory = await categoryQueryExists(categoryData);
    if (existingCategory) {
      return { code: 409, message: "Category already exists" };
    }

    await createNewCategory(categoryData);
    await Redis.del(...cacheKeysToDelete);

    return { code: 201, message: "Category created successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const categoryList = async ({ userId, type }: TCategoryQueryList) => {
  try {
    const cacheKey = `${CATEGORIES_PREFIX}${userId}${type ? `:${type}` : ""}`;

    const cachedCategories = await Redis.get(cacheKey);
    if (cachedCategories) {
      return {
        code: 200,
        message: "Categories retrieved successfully",
        categories: JSON.parse(cachedCategories),
      };
    }

    const query: TCategoryQueryList = { userId };
    if (type !== undefined) query.type = type;

    const categories = await categoryQueryFind(query);
    if (categories.length === 0) {
      return {
        code: 200,
        message: "No categories found, or you have not created any",
        categories: [],
      };
    }

    await Redis.set(cacheKey, JSON.stringify(categories), "EX", 1800);

    return {
      code: 200,
      message: "Categories retrieved successfully",
      categories,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const categoryDelete = async ({
  categoryId,
  userId,
}: TCategoryId & TCategoryUserId) => {
  try {
    const [transactionUsingCategory, budgetUsingCategory] = await Promise.all([
      transactionQueryExists({ category: categoryId, userId }),
      budgetQueryExists({ category: categoryId, userId }),
    ]);
    if (transactionUsingCategory || budgetUsingCategory) {
      return {
        code: 400,
        message:
          "Category cannot be deleted as it is being used in transactions or budgets",
      };
    }

    const deletedCategory = await categoryQueryDelete({ categoryId, userId });
    if (!deletedCategory) {
      return {
        code: 404,
        message: "Category not found",
      };
    }

    const cacheKeysToDelete = [
      `${CATEGORIES_PREFIX}${userId}`,
      `${CATEGORIES_PREFIX}${userId}:${deletedCategory.type}`,
    ];

    await Redis.del(...cacheKeysToDelete);

    return {
      code: 200,
      message: "Category deleted successfully",
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const categoryUpdate = async ({
  categoryId,
  userId,
  categoryName,
  type,
}: TCategoryId & TCategoryUserId & TCategoryOptional) => {
  try {
    const [
      existingCategory,
      currentCategory,
      transactionUsingCategory,
      budgetUsingCategory,
    ] = await Promise.all([
      categoryQueryExists({
        _id: { $ne: categoryId },
        userId,
        ...(categoryName !== undefined ? { categoryName } : {}),
        ...(type !== undefined ? { type } : {}),
      }),
      categoryQueryFindOne({ _id: categoryId, userId }),
      transactionQueryExists({ category: categoryId, userId }),
      budgetQueryExists({ category: categoryId, userId }),
    ]);

    if (categoryName === undefined && type === undefined) {
      return {
        code: 400,
        message: "Either categoryName or type must be provided",
      };
    }

    if (existingCategory) {
      return {
        code: 409,
        message: "Category with the same name and type already exists",
      };
    }

    if (!currentCategory) {
      return {
        code: 404,
        message: "Category not found",
      };
    }

    const hasTypeChanged = type !== undefined && currentCategory.type !== type;

    if ((transactionUsingCategory || budgetUsingCategory) && hasTypeChanged) {
      return {
        code: 400,
        message:
          "Category type cannot be changed as it is being used in transactions or budgets",
      };
    }

    const updatedCategory: TCategoryOptional = {};
    if (categoryName !== undefined) updatedCategory.categoryName = categoryName;
    if (type !== undefined) updatedCategory.type = type;

    await categoryQueryUpdate({ _id: categoryId, userId }, updatedCategory);

    const cacheKeysToDelete = [
      `${CATEGORIES_PREFIX}${userId}`,
      `${CATEGORIES_PREFIX}${userId}:${currentCategory.type}`,
    ];

    // If the type has changed, we need to delete the cache for the new type
    if (hasTypeChanged) {
      cacheKeysToDelete.push(`${CATEGORIES_PREFIX}${userId}:${type}`);
    }

    const cacheInvalidationPromises: Promise<unknown>[] = [
      Redis.del(...cacheKeysToDelete),
    ];

    // If the category is being used in transactions or budgets, we need to delete those caches as well
    if (transactionUsingCategory || budgetUsingCategory) {
      cacheInvalidationPromises.push(
        invalidateUserBudgetCache(userId),
        invalidateUserTransactionCache(userId),
      );
    }

    await Promise.all(cacheInvalidationPromises);

    return { code: 200, message: "Category updated successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
