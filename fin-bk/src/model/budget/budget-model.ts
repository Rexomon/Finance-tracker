import { integer, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { category } from "../category/category-model";

import { timestamps } from "../config";

export const budget = pgTable(
  "budget",
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
    limit: integer().notNull(),
    month: integer().notNull(),
    year: integer().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("budget_categoryId_month_year_uniqueIdx").on(
      table.category,
      table.month,
      table.year,
    ),
  ],
);
