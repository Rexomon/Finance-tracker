import { Elysia } from "elysia";

import Auth from "../../Middleware/Auth";

import { RedisLock } from "../../Utils/RedisLocking";
import { handleError } from "../../Utils/ErrorHandling";

import {
  categoryCreate,
  categoryDelete,
  categoryList,
  categoryUpdate,
} from "./service";

import {
  CategorySchema,
  CategoryQuerySchema,
  CategoryOptionalSchema,
  CategoryIdSchema,
} from "./types";

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
    async ({ status, body, user, lock }) => {
      try {
        const { categoryName, type } = body;

        const lockKey = `CreateCategory:${user.id}:${categoryName}:${type}`;
        await lock.acquire(lockKey);

        const createNewCategory = {
          userId: user.id,
          categoryName,
          type,
        };

        const categoryResponse = await categoryCreate(createNewCategory);

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: CategorySchema },
  )

  // Get all categories for the authenticated user, optionally filtered by type
  .get(
    "",
    async ({ status, user, query }) => {
      try {
        const { type } = query;

        const categoryResponse = await categoryList({ userId: user.id, type });

        return status(categoryResponse.code, {
          message: categoryResponse.message,
          ...(categoryResponse.categories && {
            categories: categoryResponse.categories,
          }),
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { query: CategoryQuerySchema },
  )

  // Delete a category by ID
  .delete(
    "/:categoryId",
    async ({ status, user, lock, params: { categoryId } }) => {
      try {
        const lockKey = `DeleteCategory:${user.id}:${categoryId}`;
        await lock.acquire(lockKey);

        const categoryResponse = await categoryDelete({
          categoryId,
          userId: user.id,
        });

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { params: CategoryIdSchema },
  )

  // Update a category by ID
  .patch(
    "/:categoryId",
    async ({ status, body, user, lock, params: { categoryId } }) => {
      try {
        const { categoryName, type } = body;

        const lockKey = `UpdateCategory:${user.id}:${categoryId}`;
        await lock.acquire(lockKey);

        const categoryResponse = await categoryUpdate({
          categoryId,
          userId: user.id,
          categoryName,
          type,
        });

        return status(categoryResponse.code, {
          message: categoryResponse.message,
        });
      } catch (error) {
        const { code, message } = handleError(error);

        return status(code, { message });
      }
    },
    { body: CategoryOptionalSchema, params: CategoryIdSchema },
  );

export default CategoryHandling;
