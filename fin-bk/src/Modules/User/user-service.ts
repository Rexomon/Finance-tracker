import { password as BunPassword } from "bun";

import { handleError } from "../../Utils/ErrorHandling";

import {
  userLoginQuery,
  userRegisterQuery,
  getUserByNameAndEmail,
} from "./user-db";

import type { TUserLogin, TUserRegister } from "./user-types";

export const userLoginService = async ({
  email,
  password,
}: TUserLogin): Promise<
  | {
      code: 401 | 429 | 500;
      message: string;
    }
  | {
      code: 200;
      message: string;
      user: {
        id: number;
        name: string;
        email: string;
      };
    }
> => {
  try {
    const [user] = await userLoginQuery({ email });
    if (!user) {
      return { code: 401, message: "Email or password is incorrect" };
    }

    const isPasswordMatch = await BunPassword.verify(password, user.password);
    if (!isPasswordMatch) {
      return { code: 401, message: "Email or password is incorrect" };
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return {
      code: 200,
      message: "Login successful",
      user: userData,
    };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};

export const userRegisterService = async ({
  name,
  email,
  password,
}: TUserRegister) => {
  try {
    const capitalizeUsername = name.charAt(0).toUpperCase() + name.slice(1);

    const [existingUser] = await getUserByNameAndEmail.execute({
      name: capitalizeUsername,
      email,
    });
    if (existingUser) {
      const message =
        existingUser.name === capitalizeUsername
          ? "User already exists"
          : "Email already exists";

      return { code: 409, message };
    }

    const hashedPassword = await BunPassword.hash(password, {
      algorithm: "argon2id",
      memoryCost: 19000,
      timeCost: 2,
    });

    const newUser = {
      name: capitalizeUsername.trim(),
      email: email.trim(),
      password: hashedPassword,
    } satisfies TUserRegister;

    await userRegisterQuery(newUser);

    return { code: 201, message: "User registered successfully" };
  } catch (error) {
    const { code, message } = handleError(error);

    return { code, message };
  }
};
