import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		categoryName: {
			type: String,
			required: true,
		},

		type: {
			type: String,
			required: true,
			enum: ["income", "expense"],
		},
	},
	{
		timestamps: true,
	},
);

CategorySchema.index({ userId: 1, categoryName: 1, type: 1 }, { unique: true });

const CategoryModel = mongoose.model("Category", CategorySchema);
export default CategoryModel;
