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

export const CategoryQueryTypes = t.Object({
	type: t.Optional(
		t.Union([t.Literal("income"), t.Literal("expense")], {
			error: "Invalid category type",
		}),
	),
});

export type CategoryQueryFilter = {
	userId: string | number;
	type?: "income" | "expense";
};
