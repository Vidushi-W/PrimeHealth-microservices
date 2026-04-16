const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["medication", "appointment"],
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    dateTime: {
      type: Date,
      required: true,
    },
    repeat: {
      type: String,
      enum: ["once", "daily", "weekly"],
      default: "once",
      trim: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "done", "missed"],
      default: "upcoming",
      trim: true,
    },
    medicineName: {
      type: String,
      trim: true,
      default: "",
    },
    dosage: {
      type: String,
      trim: true,
      default: "",
    },
    frequency: {
      type: String,
      trim: true,
      default: "",
    },
    doctorName: {
      type: String,
      trim: true,
      default: "",
    },
    hospitalName: {
      type: String,
      trim: true,
      default: "",
    },
    notification: {
      emailEnabled: {
        type: Boolean,
        default: true,
      },
      lastEmailSentAt: {
        type: Date,
        default: null,
      },
      lastEmailError: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  {
    timestamps: true,
    collection: "patient_reminders",
  }
);

module.exports = mongoose.model("Reminder", reminderSchema);
