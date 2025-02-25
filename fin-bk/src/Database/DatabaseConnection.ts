import mongoose from "mongoose";

const connectToDatabase = async () => {
	const dbConnectString: string = Bun.env.DATABASE_URI as string;

	if (!dbConnectString) {
		console.error("Database connection string is not defined");
		process.exit(1);
	}

	try {
		const terkoneksi = await mongoose.connect(dbConnectString);
    console.log(
        "🟢 Database connected successfully | 🌐 Host: %s | 📚 DB: %s",
        terkoneksi.connection.host,
        terkoneksi.connection.name,
    );
	} catch (error) {
		console.error("Database connection error:", error);
		process.exit(1);
	}
};

export default connectToDatabase;
