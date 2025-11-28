import mongoose from "mongoose";
import logger from "../lib/logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.log("MONGODB CONNECTED SUCCESSFULLY!");
  } catch (error) {
    logger.error("Error connecting to MONGODB", error);
    process.exit(1); // exit with failure
  }
};
