import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    limit: {
      type: Number,
      min: 0,
      required: true,
    },

    month: {
      type: Number,
      min: 0,
      max: 12,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

BudgetSchema.index(
  { userId: 1, category: 1, month: 1, year: 1 },
  { unique: true },
);

const BudgetModel = mongoose.model("Budget", BudgetSchema);
export default BudgetModel;
