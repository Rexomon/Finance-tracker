import mongoose from "mongoose";

const connectToDatabase = async () => {
	const dbConnectString: string = Bun.env.DATABASE_URL as string;

	if (!dbConnectString) {
		console.error("Database connection string is not defined");
		process.exit(1);
	}

	try {
		const mongooseConnection = await mongoose.connect(dbConnectString);
		console.log(
			"🟢 Database connected successfully | 🌐 Host: %s | 📚 DB: %s",
			mongooseConnection.connection.host,
			mongooseConnection.connection.name,
		);
	} catch (error) {
		console.error("Database connection error:", error);
		process.exit(1);
	}
};

export const safelyCloseMongoDB = async () => {
	try {
		await mongoose.connection.close();
		console.log("MongoDB connection closed safely.");
	} catch (error) {
		console.error("Error closing MongoDB connection:", error);
	}
};

export default connectToDatabase;
