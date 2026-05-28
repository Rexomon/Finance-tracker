import { Elysia } from "elysia";

import UserRoutes from "./Modules/User/user-index";
import BudgetRoutes from "./Modules/Budget/budget-index";
import CategoryRoutes from "./Modules/Category/category-index";
import TransactionRoutes from "./Modules/Transaction/transaction-index";

export const apiRoutesV1 = new Elysia({ name: "apiV1", prefix: "/v1" })
  .get("/health", () => {
    return { message: "Ok" };
  })
  .use(UserRoutes)
  .use(BudgetRoutes)
  .use(CategoryRoutes)
  .use(TransactionRoutes);
