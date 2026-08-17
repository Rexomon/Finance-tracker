import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { category } from "../category/category-model";

import { timestamps } from "../config";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const transaction = pgTable(
  "transaction",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    category: integer()
      .references(() => category.id, {
        onDelete: "cascade",
      })
      .notNull(),
    amount: integer().notNull(),
    type: transactionTypeEnum().notNull(),
    description: varchar({ length: 256 }).notNull(),
    date: timestamp({ mode: "date" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("transaction_categoryId_type_date_idx").on(
      table.category,
      table.type,
      table.date.desc(),
    ),
  ],
);
