import { eq, or, sql } from "drizzle-orm";

import db from "../../Database/db-connection";

import { user } from "../../Model/User/user-model";

import type { TUserLogin, TUserRegister } from "./user-types";

export const userByNameAndEmailQuery = db
  .select({ name: user.name, email: user.email })
  .from(user)
  .where(
    or(
      eq(user.name, sql.placeholder("name")),
      eq(user.email, sql.placeholder("email")),
    ),
  )
  .limit(1)
  .prepare("userByNameAndEmailQuery");

export const userByIdQuery = db
  .select({ id: user.id, name: user.name, email: user.email })
  .from(user)
  .where(eq(user.id, sql.placeholder("userId")))
  .limit(1)
  .prepare("userByIdQuery");

export function registerUserQuery(data: TUserRegister) {
  return db.insert(user).values(data);
}

export function loginUserQuery({ email }: Pick<TUserLogin, "email">) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
}
