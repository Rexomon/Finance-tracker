import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		amount: {
			type: Number,
			required: true,
		},

		type: {
			type: String,
			required: true,
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

const TransactionModel = mongoose.model("Transaction", TransactionSchema);
export default TransactionModel;
