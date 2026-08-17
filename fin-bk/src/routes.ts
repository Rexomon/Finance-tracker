import { Elysia } from "elysia";

import UserRoutes from "./modules/user/user-index";
import BudgetRoutes from "./modules/budget/budget-index";
import CategoryRoutes from "./modules/category/category-index";
import TransactionRoutes from "./modules/transaction/transaction-index";

export const apiRoutesV1 = new Elysia({ name: "apiV1", prefix: "/v1" })
  .get("/health", () => {
    return { message: "Ok" };
  })
  .use(UserRoutes)
  .use(BudgetRoutes)
  .use(CategoryRoutes)
  .use(TransactionRoutes);
