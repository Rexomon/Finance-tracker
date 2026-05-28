import { Elysia } from "elysia";

import { redis } from "../../Config/Redis";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import {
  categoryDeleteService,
  categoryUpdateService,
  categoryListService,
  categoryCreateService,
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

const CATEGORIES_PREFIX = "categories:";

const CATEGORIES_CACHE_TTL = 60 * 30; // 30 minutes

const CategoryHandling = new Elysia({
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
    async ({ lock, status, user: { id }, body: { categoryName, type } }) => {
      const userId = id;
      const createNewCategory = {
        userId,
        categoryName,
        type,
      };

      try {
        const lockKey = `CreateCategory:${userId}:${categoryName}:${type}`;
        await lock.acquire(lockKey);

        const categoryResponse = await categoryCreateService(createNewCategory);
        if (categoryResponse.code === 201) {
          const cacheKeysToDelete = [
            `${CATEGORIES_PREFIX}${userId}`,
            `${CATEGORIES_PREFIX}${userId}:${type}`,
          ];

          await redis.del(...cacheKeysToDelete);
        }

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: CategorySchema, auth: true },
  )

  // Get all categories for the authenticated user, optionally filtered by type
  .get(
    "",
    async ({ status, user: { id }, query: { type } }) => {
      const userId = id;
      const filter = { userId, type };

      try {
        const cacheKey = `${CATEGORIES_PREFIX}${userId}${type ? `:${type}` : ""}`;

        const cachedCategories = await redis.get(cacheKey);
        if (cachedCategories) {
          return status(200, {
            message: "Categories retrieved successfully",
            categories: JSON.parse(cachedCategories),
          });
        }

        const categoryResponse = await categoryListService(filter);
        if (categoryResponse.code !== 200) {
          return status(categoryResponse.code, {
            message: categoryResponse.message,
          });
        }

        await redis.set(
          cacheKey,
          JSON.stringify(categoryResponse.categories),
          "EX",
          CATEGORIES_CACHE_TTL,
        );

        return status(categoryResponse.code, {
          message: categoryResponse.message,
          categories: categoryResponse.categories,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: CategoryQuerySchema, auth: true },
  )

  // Delete a category by ID
  .delete(
    "/:categoryId",
    async ({ status, lock, user: { id }, params: { categoryId } }) => {
      const userId = id;
      const filter = { categoryId, userId };

      try {
        const lockKey = `DeleteCategory:${userId}:${categoryId}`;
        await lock.acquire(lockKey);

        const categoryResponse = await categoryDeleteService(filter);
        if (categoryResponse.code === 200) {
          const cacheKeysToDelete = [
            `${CATEGORIES_PREFIX}${userId}`,
            `${CATEGORIES_PREFIX}${userId}:${categoryResponse.type}`,
          ];

          await redis.del(...cacheKeysToDelete);
        }

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: CategoryIdSchema, auth: true },
  )

  // Update a category by ID
  .patch(
    "/:categoryId",
    async ({
      status,
      lock,
      user: { id },
      params: { categoryId },
      body: { categoryName, type },
    }) => {
      const userId = id;
      const filter = { categoryId, userId, categoryName, type };

      try {
        const lockKey = `UpdateCategory:${userId}:${categoryId}`;
        await lock.acquire(lockKey);

        const categoryResponse = await categoryUpdateService(filter);
        if (categoryResponse.code === 200) {
          const cacheKeysToDelete = [
            `${CATEGORIES_PREFIX}${userId}`,
            `${CATEGORIES_PREFIX}${userId}:${categoryResponse.currentType}`,
          ];

          if (categoryResponse.hasTypeChanged) {
            cacheKeysToDelete.push(`${CATEGORIES_PREFIX}${userId}:${type}`);
          }

          //If the category is being used in transactions or budgets, we need to delete those caches as well
          const cacheInvalidationPromises = [];
          if (categoryResponse.isCategoryBeingUsed) {
            cacheInvalidationPromises.push(
              invalidateUserBudgetCache(userId),
              invalidateUserTransactionCache(userId),
            );
          }

          await Promise.all([
            redis.del(cacheKeysToDelete),
            ...cacheInvalidationPromises,
          ]);
        }

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: CategoryOptionalSchema, params: CategoryIdSchema, auth: true },
  );

export default CategoryHandling;
