import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    categoryName: {
      type: String,
      minLength: 3,
      maxLength: 64,
      trim: true,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

CategorySchema.index({ userId: 1, categoryName: 1, type: 1 }, { unique: true });

const CategoryModel = mongoose.model("Category", CategorySchema);
export default CategoryModel;
