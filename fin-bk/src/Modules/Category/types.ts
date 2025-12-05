import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";
import type { Prettify } from "../../Types/types";

export const CategoryUserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export const CategorySchema = t.Object(
  {
    categoryName: t.String({
      minLength: 3,
      maxLength: 64,
      pattern: "^\\S(?:.*\\S)?$",
      error:
        "Category name must be at least 3 characters with no leading/trailing whitespace",
    }),
    type: t.Union([t.Literal("income"), t.Literal("expense")], {
      error: "Invalid category type",
    }),
  },
  { additionalProperties: false },
);

export const CategoryDBQuerySchema = t.Intersect([
  t.Object({ userId: ObjectIdSchema }),
  t.Record(t.String(), t.Unknown()),
]);

export const CategoryIdSchema = t.Object({
  categoryId: ObjectIdSchema,
});

export const CategoryOptionalSchema = t.Partial(CategorySchema);

export const CategoryQuerySchema = t.Partial(t.Pick(CategorySchema, ["type"]));

export type TCategory = typeof CategorySchema.static;
export type TCategoryId = typeof CategoryIdSchema.static;
export type TCategoryQuery = typeof CategoryQuerySchema.static;
export type TCategoryUserId = typeof CategoryUserIdSchema.static;
export type TCategoryDBQuery = typeof CategoryDBQuerySchema.static;
export type TCategoryOptional = typeof CategoryOptionalSchema.static;

export type TCategoryDBDelete = Prettify<TCategoryId & TCategoryUserId>;
export type TCategoryDBCreate = Prettify<TCategoryUserId & TCategory>;
export type TCategoryQueryList = Prettify<TCategoryUserId & TCategoryQuery>;
