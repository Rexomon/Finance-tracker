import { Types } from "mongoose";

import TransactionModel from "../../Model/TransactionModel";

import type {
  TTransactionDBCreate,
  TTransactionDBDelete,
  TTransactionDBQuery,
  TTransactionDBUpdate,
} from "./types";

export const transactionQueryExists = (filter: TTransactionDBQuery) => {
  return TransactionModel.exists(filter);
};

export const transactionQueryFindOne = (filter: TTransactionDBQuery) => {
  return TransactionModel.findOne(filter, {
    userId: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  }).lean();
};

export const transactionQueryFind = async (
  userId: string,
  page: number,
  pageSize: number,
) => {
  const results = await TransactionModel.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $sort: { date: -1 } },
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

export const transactionQueryDelete = ({
  transactionId,
  userId,
}: TTransactionDBDelete) => {
  return TransactionModel.findOneAndDelete(
    {
      _id: transactionId,
      userId,
    },
    { projection: { userId: 0, __v: 0 } },
  ).lean();
};

export const transactionQueryUpdate = (
  filter: TTransactionDBQuery,
  transactionData: TTransactionDBUpdate,
) => {
  return TransactionModel.findOneAndUpdate(filter, transactionData, {
    projection: { userId: 0, __v: 0 },
    new: true,
  }).lean();
};

export const createNewTransaction = (transactionData: TTransactionDBCreate) => {
  return TransactionModel.create(transactionData);
};
