import { handleError } from "../../Utils/ErrorHandling";
import { getBudgetByCategory, getExistingBudget } from "../Budget/budget-db";
import { getTransactionByCategory } from "../Transaction/transaction-db";

import {
  categoryListQuery,
  getExistingCategory,
  categoryCreateQuery,
  categoryUpdateQuery,
  categoryDeleteQuery,
} from "./category-db";

import type {
  TCategoryCreate,
  TCategoryOptional,
  TCategoryListQuery,
  TCategoryUpdateQuery,
  TCategoryDeleteQuery,
} from "./category-types";

export const categoryCreateService = async ({
  userId,
  categoryName,
  type,
}: TCategoryCreate) => {
  try {
    const categoryData = {
      userId,
      categoryName,
      type,
    } satisfies TCategoryCreate;

    const [existingCategory] = await getExistingCategory(categoryData);
    if (existingCategory) {
      return { code: 409, message: "Category already exists" };
    }

    await categoryCreateQuery(categoryData);

    return { code: 201, message: "Category created successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const categoryListService = async ({
  userId,
  type,
}: TCategoryListQuery): Promise<
  | {
      code: 429 | 500;
      message: string;
    }
  | {
      code: 200;
      message: string;
      categories: {
        _id: number;
        categoryName: string;
        type: "income" | "expense";
        createdAt: Date;
        updatedAt: Date;
      }[];
    }
> => {
  try {
    const query: TCategoryListQuery = { userId };
    if (type !== undefined) query.type = type;

    const categories = await categoryListQuery(query);
    if (categories.length === 0) {
      return {
        code: 200,
        message: "No categories found, or you have not created any",
        categories: [],
      };
    }

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

export const categoryDeleteService = async ({
  categoryId,
  userId,
}: TCategoryDeleteQuery): Promise<
  | {
      code: 400 | 404 | 429 | 500;
      message: string;
    }
  | {
      code: 200;
      message: string;
      type: "income" | "expense";
    }
> => {
  try {
    const [[transactionUsingCategory], [budgetUsingCategory]] =
      await Promise.all([
        getTransactionByCategory({ category: categoryId, userId }),
        getExistingBudget({ category: categoryId, userId, filter: "equal" }),
      ]);
    if (transactionUsingCategory || budgetUsingCategory) {
      return {
        code: 400,
        message:
          "Category cannot be deleted as it is being used in transactions or budgets",
      };
    }

    const [deletedCategory] = await categoryDeleteQuery({ categoryId, userId });
    if (!deletedCategory) {
      return {
        code: 404,
        message: "Category not found",
      };
    }

    return {
      code: 200,
      message: "Category deleted successfully",
      type: deletedCategory.type,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const categoryUpdateService = async ({
  categoryId,
  userId,
  categoryName,
  type,
}: TCategoryUpdateQuery): Promise<
  | {
      code: 400 | 404 | 409 | 429 | 500;
      message: string;
    }
  | {
      code: 200;
      message: string;
      hasTypeChanged: boolean;
      isCategoryBeingUsed: boolean;
      currentType: "income" | "expense";
    }
> => {
  try {
    const [
      [existingCategory],
      [currentCategory],
      [transactionUsingCategory],
      [budgetUsingCategory],
    ] = await Promise.all([
      getExistingCategory({
        categoryId,
        userId,
        ...(categoryName !== undefined ? { categoryName } : {}),
        filter: "notEqual",
      }),
      getExistingCategory({
        categoryId,
        userId,
        filter: "equal",
      }),
      getTransactionByCategory({ category: categoryId, userId }),
      getBudgetByCategory({ category: categoryId, userId }),
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

    await categoryUpdateQuery({ categoryId, userId, ...updatedCategory });

    let isCategoryBeingUsed = false;
    if (transactionUsingCategory || budgetUsingCategory) {
      isCategoryBeingUsed = true;
    }

    return {
      code: 200,
      message: "Category updated successfully",
      hasTypeChanged,
      isCategoryBeingUsed,
      currentType: currentCategory.type,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
