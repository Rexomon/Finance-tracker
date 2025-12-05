import CategoryModel from "../../Model/CategoryModel";

import type {
  TCategoryDBQuery,
  TCategoryOptional,
  TCategoryDBDelete,
  TCategoryDBCreate,
} from "./types";

export const categoryQueryExists = (filter: TCategoryDBQuery) => {
  return CategoryModel.exists(filter);
};

export const categoryQueryFindOne = (filter: TCategoryDBQuery) => {
  return CategoryModel.findOne(filter, {
    userId: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  }).lean();
};

export const categoryQueryFind = (filter: TCategoryDBQuery) => {
  return CategoryModel.find(filter, { userId: 0, __v: 0 })
    .sort({ type: 1 })
    .lean();
};

export const categoryQueryDelete = ({
  categoryId,
  userId,
}: TCategoryDBDelete) => {
  return CategoryModel.findOneAndDelete(
    {
      _id: categoryId,
      userId,
    },
    { projection: { userId: 0, __v: 0 } },
  ).lean();
};

export const categoryQueryUpdate = (
  filter: TCategoryDBQuery,
  categoryData: TCategoryOptional,
) => {
  return CategoryModel.findOneAndUpdate(filter, categoryData, {
    projection: { userId: 0, __v: 0 },
    new: true,
  }).lean();
};

export const createNewCategory = (categoryData: TCategoryDBCreate) => {
  return CategoryModel.create(categoryData);
};
