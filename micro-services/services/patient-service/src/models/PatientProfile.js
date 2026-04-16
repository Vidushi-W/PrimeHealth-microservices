const mongoose = require("mongoose");

const reportMetricSchema = new mongoose.Schema(
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

const reportAnalyzerSchema = new mongoose.Schema(
  {
    status: {
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
    extractedText: {
      type: String,
      trim: true,
      default: "",
    },
    extractedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
    metrics: {
      type: reportMetricSchema,
      default: () => ({}),
    },
    analyzedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const uploadedReportSchema = new mongoose.Schema(
  {
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientProfile",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      min: 0,
      default: 0,
    },
    reportType: {
      type: String,
      required: true,
      trim: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    hospitalOrLabName: {
      type: String,
      required: true,
      trim: true,
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
    analyzer: {
      type: reportAnalyzerSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const patientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: "",
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    profilePhoto: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedReports: {
      type: [uploadedReportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "patient_profiles",
  }
);

module.exports = mongoose.model("PatientProfile", patientProfileSchema);
