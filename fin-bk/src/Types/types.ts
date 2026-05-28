import { t } from "elysia";

export const ObjectIdSchema = t.Integer({
  minimum: 1,
  maximum: 2147483647,
  error: "Invalid id",
});

export const AuthUserSchema = t.Object({
  user: t.Object({
    id: t.Integer(),
    name: t.String(),
    email: t.String(),
  }),
  iat: t.Integer(),
});

export type Prettify<T> = {
  [K in keyof T]: T[K];
};

export type TObjectId = typeof ObjectIdSchema.static;
export type TAuthUser = typeof AuthUserSchema.static;
