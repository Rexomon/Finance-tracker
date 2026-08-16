import { Elysia } from "elysia";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { tryCatch, handleError } from "../../Utils/ErrorHandling";

import {
  deleteCategoryService,
  updateCategoryService,
  listCategoryService,
  createCategoryService,
} from "./category-service";

import {
  CategorySchema,
  CategoryQuerySchema,
  CategoryOptionalSchema,
  CategoryIdSchema,
} from "./category-types";
import {
  invalidateUserBudgetCache,
  invalidateUserTransactionCache,
} from "../../Utils/RedisCache";

const CATEGORIES_CACHE_EXPIRY = 60 * 30; // 30 minutes

const CATEGORIES_PREFIX = "categories:";

const CategoryRoutes = new Elysia({
  strictPath: true,
  name: "CategoryApiV1",
  prefix: "/categories",
  detail: { tags: ["Category"] },
})
  .use(Auth)
  .use(RedisLock)
  // ==Authenticated Routes==
  // Create a new category for the authenticated user
  .post(
    "",
    async ({
      lock,
      status,
      user: { id: userId },
      body: { categoryName, type },
    }) => {
      const categoryCreationInput = {
        userId,
        categoryName,
        type,
      };
      const lockKey = `CreateCategory:${userId}:${categoryName}:${type}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const categoryCreationResult = await createCategoryService(
        categoryCreationInput,
      );
      if (!categoryCreationResult.success) {
        return status(categoryCreationResult.error.code, {
          message: categoryCreationResult.error.message,
        });
      }

      const cacheKeysToDelete = [
        `${CATEGORIES_PREFIX}${userId}`,
        `${CATEGORIES_PREFIX}${userId}:${type}`,
      ];

      await redis.del(...cacheKeysToDelete);

      return status(categoryCreationResult.data.code, {
        message: categoryCreationResult.data.message,
      });
    },
    { body: CategorySchema, auth: true },
  )

  // Get all categories for the authenticated user, optionally filtered by type
  .get(
    "",
    async ({ status, user: { id: userId }, query: { type } }) => {
      const categoryListInput = { userId, type };
      const cacheKey = `${CATEGORIES_PREFIX}${userId}${type ? `:${type}` : ""}`;

      const cachedCategories = await redis.get(cacheKey);
      if (cachedCategories) {
        return status(200, {
          message: "Categories retrieved successfully",
          categories: JSON.parse(cachedCategories),
        });
      }

      const categoryListResult = await listCategoryService(categoryListInput);
      if (!categoryListResult.success) {
        return status(categoryListResult.error.code, {
          message: categoryListResult.error.message,
        });
      }

      await redis.set(
        cacheKey,
        JSON.stringify(categoryListResult.data.categories),
        "EX",
        CATEGORIES_CACHE_EXPIRY,
      );

      return status(categoryListResult.data.code, {
        message: categoryListResult.data.message,
        categories: categoryListResult.data.categories,
      });
    },
    { query: CategoryQuerySchema, auth: true },
  )

  // Delete a category by ID
  .delete(
    "/:categoryId",
    async ({ status, lock, user: { id: userId }, params: { categoryId } }) => {
      const categoryDeletionInput = { categoryId, userId };
      const lockKey = `DeleteCategory:${userId}:${categoryId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const categoryDeletionResult = await deleteCategoryService(
        categoryDeletionInput,
      );
      if (!categoryDeletionResult.success) {
        return status(categoryDeletionResult.error.code, {
          message: categoryDeletionResult.error.message,
        });
      }

      const cacheKeysToDelete = [
        `${CATEGORIES_PREFIX}${userId}`,
        `${CATEGORIES_PREFIX}${userId}:${categoryDeletionResult.data.type}`,
      ];

      await redis.del(...cacheKeysToDelete);

      return status(categoryDeletionResult.data.code, {
        message: categoryDeletionResult.data.message,
      });
    },
    { params: CategoryIdSchema, auth: true },
  )

  // Update a category by ID
  .patch(
    "/:categoryId",
    async ({
      status,
      lock,
      user: { id: userId },
      params: { categoryId },
      body: { categoryName, type },
    }) => {
      const categoryUpdateInput = { categoryId, userId, categoryName, type };
      const lockKey = `UpdateCategory:${userId}:${categoryId}`;

      const lockResult = await tryCatch(() => lock.acquire(lockKey));
      if (!lockResult.success) {
        const { code, message } = handleError(lockResult.error);
        return status(code, { message });
      }

      const categoryUpdateResult =
        await updateCategoryService(categoryUpdateInput);
      if (!categoryUpdateResult.success) {
        return status(categoryUpdateResult.error.code, {
          message: categoryUpdateResult.error.message,
        });
      }

      const cacheKeysToDelete = [
        `${CATEGORIES_PREFIX}${userId}`,
        `${CATEGORIES_PREFIX}${userId}:${categoryUpdateResult.data.currentType}`,
      ];

      if (categoryUpdateResult.data.hasTypeChanged) {
        cacheKeysToDelete.push(`${CATEGORIES_PREFIX}${userId}:${type}`);
      }

      //If the category is being used in transactions or budgets, we need to delete those caches as well
      const cacheInvalidationPromises = [];
      if (categoryUpdateResult.data.isCategoryBeingUsed) {
        cacheInvalidationPromises.push(
          invalidateUserBudgetCache(userId),
          invalidateUserTransactionCache(userId),
        );
      }

      await Promise.all([
        redis.del(cacheKeysToDelete),
        ...cacheInvalidationPromises,
      ]);

      return status(categoryUpdateResult.data.code, {
        message: categoryUpdateResult.data.message,
      });
    },
    { body: CategoryOptionalSchema, params: CategoryIdSchema, auth: true },
  );

export default CategoryRoutes;
