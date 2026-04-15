const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const patientProfileRoutes = require("./routes/patientProfileRoutes");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Patient service is running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    message: "Patient service is healthy",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientProfileRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Patient service running on port ${PORT}`);
});
