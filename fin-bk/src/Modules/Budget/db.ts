import { Types } from "mongoose";

import BudgetModel from "../../Model/BudgetModel";

import type {
  TBudgetDBQuery,
  TBudgetDBDelete,
  TBudgetDBUpdate,
  TBudgetDBCreate,
  TBudgetAggregate,
} from "./types";

export const budgetQueryExists = (filter: TBudgetDBQuery) => {
  return BudgetModel.exists(filter);
};

export const budgetQueryFindOne = (filter: TBudgetDBQuery) => {
  return BudgetModel.findOne(filter, {
    userId: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  }).lean();
};

export const budgetQueryFind = async (
  userId: string,
  page: number,
  pageSize: number,
) => {
  const results = await BudgetModel.aggregate<TBudgetAggregate>([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $sort: { year: -1, month: -1 } },
    {
      $facet: {
        data: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userId: 0,
              __v: 0,
              "category.userId": 0,
              "category.createdAt": 0,
              "category.updatedAt": 0,
              "category.__v": 0,
            },
          },
        ],

        metadata: [{ $count: "totalCount" }],
      },
    },
  ]);

  const data = results[0].data || [];
  const totalCount = results[0].metadata[0]?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 0;

  return { metadata: { totalCount, page, pageSize, totalPages }, data };
};

export const budgetQueryDelete = ({ budgetId, userId }: TBudgetDBDelete) => {
  return BudgetModel.findOneAndDelete(
    { _id: budgetId, userId },
    { projection: { userId: 0, __v: 0 } },
  ).lean();
};

export const budgetQueryUpdate = (
  filter: TBudgetDBQuery,
  budgetData: TBudgetDBUpdate,
) => {
  return BudgetModel.findOneAndUpdate(filter, budgetData, {
    projection: { userId: 0, __v: 0 },
    new: true,
  }).lean();
};

export const createNewBudget = (budgetData: TBudgetDBCreate) => {
  return BudgetModel.create(budgetData);
};
