import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "../config";

export const user = pgTable("user", {
  id: integer().primaryKey().generatedAlwaysAsIdentity({
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  name: varchar({ length: 20 }).notNull().unique(),
  email: varchar({ length: 254 }).notNull().unique(),
  password: varchar({ length: 128 }).notNull(),
  ...timestamps,
});
