const mongoose = require("mongoose");

const riskAssessmentSchema = new mongoose.Schema(
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
    age: {
      type: Number,
      required: true,
      min: 1,
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    heightCm: {
      type: Number,
      required: true,
      min: 1,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 1,
    },
    bmi: {
      type: Number,
      required: true,
      min: 0,
    },
    bmiCategory: {
      type: String,
      trim: true,
      default: "",
    },
    familyHistoryDiabetes: {
      type: Boolean,
      default: false,
    },
    familyHistoryHypertension: {
      type: Boolean,
      default: false,
    },
    familyHistoryHeartDisease: {
      type: Boolean,
      default: false,
    },
    fastingBloodSugar: {
      type: Number,
      default: null,
    },
    bloodPressureSystolic: {
      type: Number,
      required: true,
      min: 1,
    },
    bloodPressureDiastolic: {
      type: Number,
      required: true,
      min: 1,
    },
    bloodPressureCategory: {
      type: String,
      trim: true,
      default: "",
    },
    cholesterol: {
      type: Number,
      default: null,
    },
    bloodSugarCategory: {
      type: String,
      trim: true,
      default: "",
    },
    smoker: {
      type: Boolean,
      default: false,
    },
    exerciseFrequency: {
      type: String,
      trim: true,
      default: "",
    },
    sedentaryLifestyle: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    riskLevel: {
      type: String,
      trim: true,
      required: true,
    },
    recommendedSpecialty: {
      type: String,
      trim: true,
      default: "General Physician",
    },
    explanation: {
      type: [String],
      default: [],
    },
    topRiskFactors: {
      type: [String],
      default: [],
    },
    lifestyleContribution: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifestyleBreakdown: {
      smoker: {
        type: Number,
        default: 0,
      },
      exercise: {
        type: Number,
        default: 0,
      },
      sedentary: {
        type: Number,
        default: 0,
      },
    },
    advice: {
      type: String,
      trim: true,
      default: "",
    },
    disclaimer: {
      type: String,
      trim: true,
      default: "This is a simple risk estimation and not a medical diagnosis.",
    },
  },
  {
    timestamps: true,
    collection: "risk_assessments",
  }
);

module.exports = mongoose.model("RiskAssessment", riskAssessmentSchema);
