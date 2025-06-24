import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import {
	type CategoryQueryFilter,
	CategoryQueryTypes,
	CategoryTypes,
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
				}).sort({ type: 1 });
				if (userCategoriesList.length === 0) {
					set.status = 404;
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
				return { message: "An internal server error occurred" };
			}
		},
		{ query: CategoryQueryTypes },
	)

	// Delete a category by ID
	.delete("/:categoryId", async ({ set, user, params: { categoryId } }) => {
		if (!user) {
			set.status = 401;
			return { message: "Unauthorized" };
		}

		const objectIdRegex = /^[0-9a-fA-F]{24}$/;
		if (!objectIdRegex.test(categoryId)) {
			set.status = 400;
			return { message: "Invalid category id" };
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
			const [transactionUsingCategory, budgetUsingCategory] = await Promise.all(
				[
					TransactionModel.exists({
						userId: user.id,
						category: categoryId,
					}),

					BudgetModel.exists({
						userId: user.id,
						category: categoryId,
					}),
				],
			);

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
	})

	// Update a category by ID
	.patch(
		"/:categoryId",
		async ({ set, body, user, params: { categoryId } }) => {
			if (!user) {
				set.status = 401;
				return { message: "Unauthorized" };
			}

			const objectIdRegex = /^[0-9a-fA-F]{24}$/;
			if (!objectIdRegex.test(categoryId)) {
				set.status = 400;
				return { message: "Invalid category id" };
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
					CategoryModel.exists({
						_id: { $ne: categoryId },
						userId: user.id,
						categoryName: categoryName,
						type: type,
					}),

					CategoryModel.findOne({
						userId: user.id,
						_id: categoryId,
					}),

					TransactionModel.exists({
						userId: user.id,
						category: categoryId,
					}),

					BudgetModel.exists({
						userId: user.id,
						category: categoryId,
					}),
				]);

				if (existingCategory) {
					set.status = 409;
					return { message: "Category already exists" };
				}

				if (!currentCategory) {
					set.status = 404;
					return { message: "Category not found" };
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

				await CategoryModel.updateOne(
					{
						userId: user.id,
						_id: categoryId,
					},
					{
						categoryName: categoryName,
						type: type,
					},
					{
						new: true,
					},
				);

				// If the category is not being used in transactions or budgets, we can safely update it
				if (!transactionUsingCategory && !budgetUsingCategory) {
					const cacheKeysToDelete = [
						`categories:${user.id}`,
						`categories:${user.id}:income`,
						`categories:${user.id}:expense`,
					];

					await Promise.all([Redis.del(...cacheKeysToDelete)]);

					set.status = 200;
					return { message: "Lonely Category updated successfully" };
				}

				const cacheKeysToDelete = [
					`budgets:${user.id}`,
					`transactions:${user.id}`,
					`categories:${user.id}`,
					`categories:${user.id}:income`,
					`categories:${user.id}:expense`,
				];

				await Redis.del(...cacheKeysToDelete);

				set.status = 200;
				return { message: "Category updated successfully" };
			} catch (error) {
				set.status = 500;
				console.error(error);
				return { message: "An internal server error occurred" };
			}
		},
		{ body: CategoryTypes },
	);

export default CategoryHandling;
