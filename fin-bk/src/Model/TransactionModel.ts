import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      required: true,
      minLength: 1,
      maxLength: 256,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index to ensure unique transactions per user, category, and date
TransactionSchema.index({ userId: 1, category: 1, date: 1 });

// Index for user-scoped date range/sort queries
TransactionSchema.index({ userId: 1, date: -1 });

const TransactionModel = mongoose.model("Transaction", TransactionSchema);
export default TransactionModel;
