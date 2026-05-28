import { t } from "elysia";

import { ObjectIdSchema } from "../../Types/types";

export const UserRegisterSchema = t.Object({
  name: t.String({
    pattern: "^[a-zA-Z0-9]+$",
    minLength: 2,
    maxLength: 20,
    error:
      "Name can only contain letters and numbers, and cannot contain spaces",
  }),
  email: t.String({ format: "email", maxLength: 254, error: "Invalid email" }),
  password: t.String({
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    maxLength: 128,
    error:
      "Password must be at least 8 characters, and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
  }),
});

export const UserLoginSchema = t.Intersect([
  t.Pick(UserRegisterSchema, ["email"]),
  t.Object({ password: t.String({ minLength: 1, error: "Invalid password" }) }),
]);

export const UserIdSchema = t.Object({
  userId: ObjectIdSchema,
});

export type TUserId = typeof UserIdSchema.static;
export type TUserLogin = typeof UserLoginSchema.static;
export type TUserRegister = typeof UserRegisterSchema.static;
