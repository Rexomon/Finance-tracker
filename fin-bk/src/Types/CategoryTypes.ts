import { t } from "elysia";

const ObjectId = t.String({
  pattern: "^[a-fA-F0-9]{24}$",
  error: "Invalid id format",
});

export const CategoryTypes = t.Object({
  categoryName: t.String({
    minLength: 3,
    pattern: "^\\S(?:.*\\S)?$",
    error: "Category name must be at least 3 characters long",
  }),
  type: t.Union([t.Literal("income"), t.Literal("expense")], {
    error: "Invalid category type",
  }),
});

export const CategoryParamsTypes = t.Object({
  categoryId: ObjectId,
});

export const CategoryPatchTypes = t.Partial(CategoryTypes);

export const CategoryQueryTypes = t.Partial(t.Pick(CategoryTypes, ["type"]));

const categoryQueryFilter = t.Object({
  userId: ObjectId,
});

export type CategoryQueryFilter = typeof categoryQueryFilter.static &
  typeof CategoryQueryTypes.static;
