import { t } from "elysia";

export const UserRegisterTypes = t.Object({
	name: t.String({ pattern: "^[a-zA-Z0-9]+$"}),
	email: t.String({ format: "email", error: "Invalid email" }),
	password: t.String(),
});

export const UserLoginTypes = t.Object({
	email: t.String({ format: "email", error: "Invalid email" }),
	password: t.String(),
});
