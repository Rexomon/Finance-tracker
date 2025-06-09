import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			required: true,
		},

		amount: {
			type: Number,
			required: true,
		},

		type: {
			type: String,
			required: true,
			enum: ["income", "expense"],
		},

		description: {
			type: String,
			required: true,
		},

		date: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

TransactionSchema.index({ userId: 1, category: 1, date: 1 });

const TransactionModel = mongoose.model("Transaction", TransactionSchema);
export default TransactionModel;
