import {
  error,
  success,
  tryCatch,
  handleError,
} from "../../utils/error-handler";

import { getBudgetByCategoryQuery, getExistingBudgetQuery } from "../budget/budget-db";
import { getTransactionByCategoryQuery } from "../transaction/transaction-db";
import {
  listCategoryQuery,
  createCategoryQuery,
  updateCategoryQuery,
  deleteCategoryQuery,
  getExistingCategoryQuery,
} from "./category-db";

import type {
  TCategoryCreate,
  TCategoryOptional,
  TCategoryListQuery,
  TCategoryUpdateQuery,
  TCategoryDeleteQuery,
} from "./category-types";

export const createCategoryService = async ({
  userId,
  categoryName,
  type,
}: TCategoryCreate) => {
  const categoryCreationInput = {
    userId,
    categoryName,
    type,
  };

  const existingCategoryResult = await tryCatch(async () => {
    const [existingCategory] = await getExistingCategoryQuery(
      categoryCreationInput,
    );

    return existingCategory;
  });
  if (!existingCategoryResult.success) {
    const { code, message } = handleError(existingCategoryResult.error);
    return error({ code, message });
  }

  const existingCategory = existingCategoryResult.data;
  if (existingCategory) {
    return error({ code: 409, message: "Category already exists" });
  }

  const categoryCreationResult = await tryCatch(() =>
    createCategoryQuery(categoryCreationInput),
  );
  if (!categoryCreationResult.success) {
    const { code, message } = handleError(categoryCreationResult.error);
    return error({ code, message });
  }

  return success({ code: 201, message: "Category created successfully" });
};

export const listCategoryService = async ({
  userId,
  type,
}: TCategoryListQuery) => {
  const categoryListQuery: TCategoryListQuery = { userId };
  if (type !== undefined) categoryListQuery.type = type;

  const categoryListResult = await tryCatch(() =>
    listCategoryQuery(categoryListQuery),
  );
  if (!categoryListResult.success) {
    const { code, message } = handleError(categoryListResult.error);
    return error({ code, message });
  }

  if (categoryListResult.data.length === 0) {
    return success({
      code: 200,
      message: "No categories found, or you have not created any",
      categories: [],
    });
  }

  return success({
    code: 200,
    message: "Categories retrieved successfully",
    categories: categoryListResult.data,
  });
};

export const deleteCategoryService = async ({
  categoryId,
  userId,
}: TCategoryDeleteQuery) => {
  const categoryUsageResult = await tryCatch(async () => {
    const [[transactionUsingCategory], [budgetUsingCategory]] =
      await Promise.all([
        getTransactionByCategoryQuery({ category: categoryId, userId }),
        getExistingBudgetQuery({ category: categoryId, userId, matchMode: "equal" }),
      ]);

    return { transactionUsingCategory, budgetUsingCategory };
  });
  if (!categoryUsageResult.success) {
    const { code, message } = handleError(categoryUsageResult.error);
    return error({ code, message });
  }

  const { transactionUsingCategory, budgetUsingCategory } =
    categoryUsageResult.data;
  if (transactionUsingCategory || budgetUsingCategory) {
    return error({
      code: 400,
      message:
        "Category cannot be deleted as it is being used in transactions or budgets",
    });
  }

  const categoryDeletionResult = await tryCatch(async () => {
    const [deletedCategory] = await deleteCategoryQuery({ categoryId, userId });

    return deletedCategory;
  });
  if (!categoryDeletionResult.success) {
    const { code, message } = handleError(categoryDeletionResult.error);
    return error({ code, message });
  }
  if (!categoryDeletionResult.data) {
    return error({
      code: 404,
      message: "Category not found",
    });
  }

  return success({
    code: 200,
    message: "Category deleted successfully",
    type: categoryDeletionResult.data.type,
  });
};

export const updateCategoryService = async ({
  categoryId,
  userId,
  categoryName,
  type,
}: TCategoryUpdateQuery) => {
  const categoryValidationResult = await tryCatch(async () => {
    const [
      [existingCategory],
      [currentCategory],
      [transactionUsingCategory],
      [budgetUsingCategory],
    ] = await Promise.all([
      getExistingCategoryQuery({
        categoryId,
        userId,
        ...(categoryName !== undefined ? { categoryName } : {}),
        matchMode: "notEqual",
      }),
      getExistingCategoryQuery({
        categoryId,
        userId,
        matchMode: "equal",
      }),
      getTransactionByCategoryQuery({ category: categoryId, userId }),
      getBudgetByCategoryQuery({ category: categoryId, userId }),
    ]);

    return {
      existingCategory,
      currentCategory,
      transactionUsingCategory,
      budgetUsingCategory,
    };
  });
  if (!categoryValidationResult.success) {
    const { code, message } = handleError(categoryValidationResult.error);
    return error({ code, message });
  }

  const {
    existingCategory,
    currentCategory,
    transactionUsingCategory,
    budgetUsingCategory,
  } = categoryValidationResult.data;
  const hasTypeChanged = type !== undefined && currentCategory.type !== type;

  if (categoryName === undefined && type === undefined) {
    return error({
      code: 400,
      message: "Either categoryName or type must be provided",
    });
  }

  if (existingCategory) {
    return error({
      code: 409,
      message: "Category with the same name and type already exists",
    });
  }

  if (!currentCategory) {
    return error({
      code: 404,
      message: "Category not found",
    });
  }

  if ((transactionUsingCategory || budgetUsingCategory) && hasTypeChanged) {
    return error({
      code: 400,
      message:
        "Category type cannot be changed as it is being used in transactions or budgets",
    });
  }

  const categoryUpdateData: TCategoryOptional = {};
  if (categoryName !== undefined)
    categoryUpdateData.categoryName = categoryName;
  if (type !== undefined) categoryUpdateData.type = type;

  const categoryUpdateResult = await tryCatch(() =>
    updateCategoryQuery({ categoryId, userId, ...categoryUpdateData }),
  );
  if (!categoryUpdateResult.success) {
    const { code, message } = handleError(categoryUpdateResult.error);
    return error({ code, message });
  }

  let isCategoryBeingUsed = false;
  if (transactionUsingCategory || budgetUsingCategory) {
    isCategoryBeingUsed = true;
  }

  return success({
    code: 200,
    message: "Category updated successfully",
    hasTypeChanged,
    isCategoryBeingUsed,
    currentType: currentCategory.type,
  });
};
