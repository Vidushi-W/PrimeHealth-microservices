const mongoose = require("mongoose");
const PatientProfile = require("../models/PatientProfile");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
    await PatientProfile.syncIndexes();
    console.log("PatientProfile indexes synchronized");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
