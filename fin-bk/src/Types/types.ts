import { t } from "elysia";

export const ObjectIdSchema = t.String({
  pattern: "^[a-fA-F0-9]{24}$",
  error: "Invalid id format",
});

export const AuthUserSchema = t.Object({
  id: ObjectIdSchema,
  email: t.String({ format: "email", maxLength: 160, error: "Invalid email" }),
  iat: t.Integer({ minimum: 0 }),
});

export type Prettify<T> = {
  [K in keyof T]: T[K];
};

export type TObjectId = typeof ObjectIdSchema.static;
export type TAuthUser = typeof AuthUserSchema.static;
