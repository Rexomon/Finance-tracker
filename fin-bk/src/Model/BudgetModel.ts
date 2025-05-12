import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		limit: {
			type: Number,
			required: true,
		},
		month: {
			type: Number,
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

const BudgetModel = mongoose.model("Budget", BudgetSchema);
export default BudgetModel;
