import { password as BunPassword } from "bun";

import {
  error,
  success,
  tryCatch,
  handleError,
} from "../../Utils/ErrorHandling";

import {
  loginUserQuery,
  registerUserQuery,
  userByNameAndEmailQuery,
} from "./user-db";

import type { TUserLogin, TUserRegister } from "./user-types";

export const loginUserService = async ({ email, password }: TUserLogin) => {
  const userLookupResult = await tryCatch(async () => {
    const [user] = await loginUserQuery({ email });
    return user;
  });
  if (!userLookupResult.success) {
    const { code, message } = handleError(userLookupResult.error);
    return error({ code, message });
  }
  if (!userLookupResult.data) {
    return error({ code: 401, message: "Email or password is incorrect" });
  }

  const passwordMatch = await BunPassword.verify(
    password,
    userLookupResult.data.password,
  );
  if (!passwordMatch) {
    return error({ code: 401, message: "Email or password is incorrect" });
  }

  const loggedInUser = {
    id: userLookupResult.data.id,
    name: userLookupResult.data.name,
    email: userLookupResult.data.email,
  };

  return success({
    code: 200,
    message: "Login successful",
    user: loggedInUser,
  });
};

export const registerUserService = async ({
  name,
  email,
  password,
}: TUserRegister) => {
  const capitalizedUsername = name.charAt(0).toUpperCase() + name.slice(1);

  const existingUser = await tryCatch(async () => {
    const [existingUser] = await userByNameAndEmailQuery.execute({
      name: capitalizedUsername,
      email,
    });
    return existingUser;
  });
  if (!existingUser.success) {
    const { code, message } = handleError(existingUser.error);
    return error({ code, message });
  }
  if (existingUser.data) {
    const message =
      existingUser.data.name === capitalizedUsername
        ? "User already exists"
        : "Email already exists";

    return error({ code: 409, message });
  }

  const hashedPassword = await BunPassword.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19000,
    timeCost: 2,
  });

  const userRegistrationInput = {
    name: capitalizedUsername.trim(),
    email: email.trim(),
    password: hashedPassword,
  } satisfies TUserRegister;

  const userRegistrationResult = await tryCatch(() =>
    registerUserQuery(userRegistrationInput),
  );
  if (!userRegistrationResult.success) {
    const { code, message } = handleError(userRegistrationResult.error);
    return error({ code, message });
  }

  return success({ code: 201, message: "User registered successfully" });
};
