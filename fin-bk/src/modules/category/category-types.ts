import { t } from "elysia";

import { ObjectIdSchema } from "../../types/types";
import type { Prettify } from "../../types/types";

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

export const CategoryIdSchema = t.Object({
  categoryId: ObjectIdSchema,
});

export const CategoryOptionalSchema = t.Partial(CategorySchema);

export const CategoryQuerySchema = t.Partial(t.Pick(CategorySchema, ["type"]));

export type TCategory = typeof CategorySchema.static;
export type TCategoryId = typeof CategoryIdSchema.static;
export type TCategoryQuery = typeof CategoryQuerySchema.static;
export type TCategoryUserId = typeof CategoryUserIdSchema.static;
export type TCategoryOptional = typeof CategoryOptionalSchema.static;

export type TCategoryCreate = Prettify<TCategoryUserId & TCategory>;
export type TCategoryListQuery = Prettify<TCategoryUserId & TCategoryQuery>;
export type TCategoryExistQuery = Prettify<
  Partial<TCategoryId> & TCategoryUserId & TCategoryOptional
>;
export type TCategoryUpdateQuery = Prettify<
  TCategoryId & TCategoryUserId & TCategoryOptional
>;
export type TCategoryDeleteQuery = Prettify<TCategoryId & TCategoryUserId>;
