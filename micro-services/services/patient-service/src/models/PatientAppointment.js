const mongoose = require("mongoose");

const appointmentReportMetricSchema = new mongoose.Schema(
  {
    glucose: {
      type: String,
      trim: true,
      default: "",
    },
    cholesterol: {
      type: String,
      trim: true,
      default: "",
    },
    hemoglobin: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const appointmentSharedReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    fileName: {
      type: String,
      trim: true,
      required: true,
    },
    fileUrl: {
      type: String,
      trim: true,
      required: true,
    },
    reportType: {
      type: String,
      trim: true,
      required: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    hospitalOrLabName: {
      type: String,
      trim: true,
      default: "",
    },
    doctorName: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    analyzerStatus: {
      type: String,
      trim: true,
      default: "not_started",
    },
    analyzerType: {
      type: String,
      trim: true,
      default: "",
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    findings: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      default: 0,
    },
    disclaimer: {
      type: String,
      trim: true,
      default: "",
    },
    extractedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metrics: {
      type: appointmentReportMetricSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const patientAppointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    hospitalOrClinic: {
      type: String,
      default: "",
      trim: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    appointmentDate: {
      type: String,
      required: true,
      trim: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["online", "physical"],
      required: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "pending_payment",
      trim: true,
    },
    paymentStatus: {
      type: String,
      default: "pending",
      trim: true,
    },
    externalAppointmentId: {
      type: String,
      default: "",
      trim: true,
    },
    sharedReports: {
      type: [appointmentSharedReportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "patient_appointments",
  }
);

module.exports = mongoose.model("PatientAppointment", patientAppointmentSchema);
