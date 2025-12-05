import UserModel from "../../Model/UserModel";

import type { TUserId, TUserLogin, TUserRegister } from "./types";

export const userLoginQuery = ({ email }: Pick<TUserLogin, "email">) => {
  return UserModel.findOne({ email }, { email: 1 }).select("+password").lean();
};

export const userRegisterQuery = ({
  name,
  email,
}: Omit<TUserRegister, "password">) => {
  return UserModel.findOne(
    { $or: [{ name }, { email }] },
    { _id: 0, name: 1, email: 1 },
  ).lean();
};

export const userQueryExists = ({ userId }: TUserId) => {
  return UserModel.exists({ _id: userId });
};

export const userQueryFindById = ({ userId }: TUserId) => {
  return UserModel.findById(userId, { email: 1 }).lean();
};

export const userCreateAccount = (userData: TUserRegister) => {
  return UserModel.create(userData);
};
