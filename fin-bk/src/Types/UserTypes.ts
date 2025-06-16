import { t } from "elysia";

export const UserRegisterTypes = t.Object({
	name: t.String({
		pattern: "^[a-zA-Z0-9]+$",
		error: "Name can only contain letters, numbers and cannot use space",
	}),
	email: t.String({ format: "email", error: "Invalid email" }),
	password: t.String({
		pattern:
			"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
		error:
			"Password must be at least 8 characters, and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).",
	}),
});

export const UserLoginTypes = t.Object({
	email: t.String({ format: "email", error: "Invalid email" }),
	password: t.String({ error: "Password is required" }),
});
