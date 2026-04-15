const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Patient service is running");
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Patient service running on port ${PORT}`);
});
