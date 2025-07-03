import { t } from "elysia";

export const CategoryTypes = t.Object({
	categoryName: t.String({
		minLength: 3,
		error: "Category name must be at least 3 characters long",
	}),
	type: t.Union([t.Literal("income"), t.Literal("expense")], {
		error: "Invalid category type",
	}),
});

export const CategoryParamsTypes = t.Object({
	categoryId: t.String({
		pattern: "^[a-fA-F0-9]{24}$",
		error: "Invalid category id",
	}),
});

export const CategoryQueryTypes = t.Partial(t.Pick(CategoryTypes, ["type"]));

export type CategoryQueryFilter = {
	userId: string | number;
} & typeof CategoryQueryTypes.static;
