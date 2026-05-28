import {
  integer,
  pgEnum,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "../User/user-model";

import { timestamps } from "../config";

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const category = pgTable(
  "category",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    categoryName: varchar({ length: 64 }).notNull(),
    type: categoryTypeEnum().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("category_userId_idx").on(table.userId, table.categoryName),
  ],
);
