const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const internalPatientRoutes = require("./routes/internalPatientRoutes");
const patientProfileRoutes = require("./routes/patientProfileRoutes");
const { isBrevoConfigured, processDueReminderEmails } = require("./services/brevoEmailService");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (_req, res) => {
  res.send("Patient service is running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    message: "Patient service is healthy",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/internal", internalPatientRoutes);
app.use("/api/patients", patientProfileRoutes);

const PORT = process.env.PORT || 5001;
const reminderWorkerIntervalMs = Number(process.env.REMINDER_EMAIL_CHECK_INTERVAL_MS || 60000);

app.listen(PORT, () => {
  console.log(`Patient service running on port ${PORT}`);

  if (isBrevoConfigured()) {
    console.log(`Reminder email worker enabled with interval ${reminderWorkerIntervalMs}ms`);
    processDueReminderEmails().catch((error) => {
      console.error("Initial reminder email worker run failed", error.message);
    });

    setInterval(() => {
      processDueReminderEmails().catch((error) => {
        console.error("Reminder email worker run failed", error.message);
      });
    }, reminderWorkerIntervalMs);
  } else {
    console.log("Reminder email worker disabled. Set BREVO_API_KEY and BREVO_SENDER_EMAIL to enable email reminders.");
  }
});
