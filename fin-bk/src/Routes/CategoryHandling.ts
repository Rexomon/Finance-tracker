import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import {
	CategoryTypes,
	CategoryQueryTypes,
	CategoryPatchTypes,
	CategoryParamsTypes,
	type CategoryQueryFilter,
} from "../Types/CategoryTypes";

const CategoryHandling = new Elysia({
	prefix: "/categories",
	detail: { tags: ["Category"] },
})
	.use(Auth)
	// ==Authenticated Routes==
	// Create a new category for the authenticated user
	.post(
		"/",
		async ({ set, body, user }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const { categoryName, type } = body;

				const lockKey = `lock:CreateCategory:${user.id}:${categoryName}:${type}`;

				const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
				if (!lockAcquired) {
					set.status = 429;
					return {
						message: "Too many requests, please wait a moment and try again",
					};
				}

				const createNewCategory = {
					userId: user.id,
					categoryName,
					type,
				};

				const existingCategory = await CategoryModel.exists(createNewCategory);
				if (existingCategory) {
					set.status = 409;
					return { message: "Category already exists" };
				}

				const cacheKeysToDelete = [
					`categories:${user.id}`,
					`categories:${user.id}:${type}`,
				];

				await Promise.all([
					CategoryModel.create(createNewCategory),
					Redis.del(...cacheKeysToDelete),
				]);

				set.status = 201;
				return { message: "Category created successfully" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: CategoryTypes },
	)

	// Get all categories for the authenticated user, optionally filtered by type
	.get(
		"/",
		async ({ set, user, query }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			try {
				const { type } = query;

				const cacheKey = `categories:${user.id}${type ? `:${type}` : ""}`;

				const cachedCategories = await Redis.get(cacheKey);
				if (cachedCategories) {
					set.status = 200;
					return { categories: JSON.parse(cachedCategories) };
				}

				const userQueryDetails: CategoryQueryFilter = { userId: user.id };
				if (type) {
					userQueryDetails.type = type;
				}

				const userCategoriesList = await CategoryModel.find(userQueryDetails, {
					userId: 0,
					__v: 0,
				})
					.sort({ type: 1 })
					.lean();
				if (userCategoriesList.length === 0) {
					set.status = 200;
					return {
						message: "No categories found, or you have not created any",
					};
				}

				await Redis.set(
					cacheKey,
					JSON.stringify(userCategoriesList),
					"EX",
					60 * 30,
				);

				set.status = 200;
				return { categories: userCategoriesList };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ query: CategoryQueryTypes },
	)

	// Delete a category by ID
	.delete(
		"/:categoryId",
		async ({ set, user, params: { categoryId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const lockKey = `lock:DeleteCategory:${user.id}:${categoryId}`;

			const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
			if (!lockAcquired) {
				set.status = 429;
				return {
					message: "Too many requests, please wait a moment and try again",
				};
			}

			try {
				const [transactionUsingCategory, budgetUsingCategory] =
					await Promise.all([
						TransactionModel.exists({
							userId: user.id,
							category: categoryId,
						}),

						BudgetModel.exists({
							userId: user.id,
							category: categoryId,
						}),
					]);

				if (transactionUsingCategory || budgetUsingCategory) {
					set.status = 400;
					return {
						message:
							"Category cannot be deleted as it is being used in transactions or budgets",
					};
				}

				const deleteCategory = await CategoryModel.findOneAndDelete({
					userId: user.id,
					_id: categoryId,
				});
				if (!deleteCategory) {
					set.status = 404;
					return { message: "Category not found" };
				}

				await Promise.all([
					Redis.del(`categories:${user.id}`),
					Redis.del(`categories:${user.id}:${deleteCategory.type}`),
				]);

				set.status = 200;
				return { message: "Category deleted successfully" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ params: CategoryParamsTypes },
	)

	// Update a category by ID
	.patch(
		"/:categoryId",
		async ({ set, body, user, params: { categoryId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const lockKey = `lock:UpdateCategory:${user.id}:${categoryId}`;

			const lockAcquired = await Redis.set(lockKey, "1", "EX", 10, "NX");
			if (!lockAcquired) {
				set.status = 429;
				return {
					message: "Too many requests, please wait a moment and try again",
				};
			}

			try {
				const { categoryName, type } = body;

				const [
					existingCategory,
					currentCategory,
					transactionUsingCategory,
					budgetUsingCategory,
				] = await Promise.all([
					// Check if the category already exists for the user
					CategoryModel.exists({
						_id: { $ne: categoryId },
						userId: user.id,
						categoryName: categoryName,
						type: type,
					}),

					// Fetch the current category to check if it exists
					CategoryModel.findOne({
						userId: user.id,
						_id: categoryId,
					}),

					// Check if the category is being used in transactions
					TransactionModel.exists({
						userId: user.id,
						category: categoryId,
					}),

					// Check if the category is being used in budgets
					BudgetModel.exists({
						userId: user.id,
						category: categoryId,
					}),
				]);
				if (!currentCategory) {
					set.status = 404;
					return { message: "Category not found" };
				}

				if (existingCategory) {
					set.status = 409;
					return { message: "Category already exists" };
				}

				// If the category is being used in transactions or budgets, we cannot change its type
				if (
					(transactionUsingCategory || budgetUsingCategory) &&
					currentCategory.type !== type
				) {
					set.status = 400;
					return {
						message:
							"Category cannot be updated as it is being used in transactions or budgets",
					};
				}

				const cacheKeysToDelete = [
					`categories:${user.id}`,
					`categories:${user.id}:${currentCategory.type}`,
				];

				// If the type has changed, we need to delete the cache for the new type
				if (currentCategory.type !== type) {
					cacheKeysToDelete.push(`categories:${user.id}:${type}`);
				}

				// If the category is being used in transactions or budgets, we need to delete those caches as well
				if (transactionUsingCategory || budgetUsingCategory) {
					cacheKeysToDelete.push(
						`budgets:${user.id}`,
						`transactions:${user.id}`,
					);
				}

				const updatedCategory = {
					categoryName,
					type,
				};

				await Promise.all([
					CategoryModel.updateOne(
						{
							userId: user.id,
							_id: categoryId,
						},
						updatedCategory,
						{
							new: true,
						},
					),

					Redis.del(...cacheKeysToDelete),
				]);
				set.status = 200;
				return { message: "Category updated successfully" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: CategoryPatchTypes, params: CategoryParamsTypes },
	);

export default CategoryHandling;
