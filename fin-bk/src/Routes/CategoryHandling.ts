import { Elysia } from "elysia";
import Redis from "../Config/Redis";
import Auth from "../Middleware/Auth";
import BudgetModel from "../Model/BudgetModel";
import CategoryModel from "../Model/CategoryModel";
import TransactionModel from "../Model/TransactionModel";
import { CategoryQueryTypes, CategoryTypes } from "../Types/CategoryTypes";

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

				const createNewCategory = {
					userId: user.id,
					categoryName,
					type,
				};

				const existingCategory = await CategoryModel.findOne(createNewCategory);
				if (existingCategory) {
					set.status = 409;
					return { message: "Category already exists" };
				}

				await CategoryModel.create(createNewCategory);
				await Redis.del(`categories:${user.id}`);
				await Redis.del(`categories:${user.id}:${type}`);

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

				const userQueryDetails: { userId: string | number; type?: string } = {
					userId: user.id,
				};
				if (type) {
					userQueryDetails.type = type;
				}

				const userCategoriesList = await CategoryModel.find(userQueryDetails, {
					userId: 0,
					__v: 0,
				}).sort({ type: 1 });

				await Redis.setex(
					cacheKey,
					60 * 30,
					JSON.stringify(userCategoriesList),
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

		try {
			const transactionUsingCategory = await TransactionModel.findOne({
				userId: user.id,
				category: categoryId,
			});
			const budgetUsingCategory = await BudgetModel.findOne({
				userId: user.id,
				category: categoryId,
			});
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

			await Redis.del(`categories:${user.id}`);
			await Redis.del(`categories:${user.id}:${deleteCategory.type}`);

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

			try {
				const { categoryName, type } = body;

				const existingCategory = await CategoryModel.findOne({
					userId: user.id,
					categoryName: categoryName,
					type: type,
				});
				if (existingCategory) {
					set.status = 409;
					return { message: "Category already exists" };
				}

				const currentCategory = await CategoryModel.findOne({
					userId: user.id,
					_id: categoryId,
				});
				if (!currentCategory) {
					set.status = 404;
					return { message: "Category not found" };
				}

				const transactionUsingCategory = await TransactionModel.findOne({
					userId: user.id,
					category: categoryId,
				});
				const budgetUsingCategory = await BudgetModel.findOne({
					userId: user.id,
					category: categoryId,
				});

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
					await Redis.del(`categories:${user.id}`);
					await Redis.del(`categories:${user.id}:income`);
					await Redis.del(`categories:${user.id}:expense`);

					set.status = 200;
					return { message: "Lonely Category updated successfully" };
				}

				await Redis.del(`budgets:${user.id}`);
				await Redis.del(`transactions:${user.id}`);
				await Redis.del(`categories:${user.id}`);
				await Redis.del(`categories:${user.id}:income`);
				await Redis.del(`categories:${user.id}:expense`);

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
