import mongoose from "mongoose";

export const connectToDatabase = async () => {
  const dbConnectString: string = Bun.env.DATABASE_URL as string;

  if (!dbConnectString) {
    throw new Error("DATABASE_URL is not defined");
  }

  try {
    const mongooseConnection = await mongoose.connect(dbConnectString, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(
      "🟢 Database connected successfully | 🌐 Host: %s | 📚 DB: %s",
      mongooseConnection.connection.host,
      mongooseConnection.connection.name,
    );
  } catch (error) {
    console.error(
      "Database connection error:",
      error instanceof Error ? error.message : error,
    );
    throw error;
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
