import { Elysia } from "elysia";

import UserRoutes from "./Modules/User/index";
import BudgetRoutes from "./Modules/Budget/index";
import CategoryRoutes from "./Modules/Category/index";
import TransactionRoutes from "./Modules/Transaction/index";

export const apiRoutesV1 = new Elysia({ name: "apiV1", prefix: "/v1" })
  .get("/health", () => {
    return { message: "Ok" };
  })
  .use(UserRoutes)
  .use(BudgetRoutes)
  .use(CategoryRoutes)
  .use(TransactionRoutes);
