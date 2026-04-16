const mongoose = require("mongoose");

const symptomCheckSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    severity: {
      type: String,
      trim: true,
      default: "",
    },
    temperature: {
      type: Number,
      default: null,
    },
    sugarLevel: {
      type: Number,
      default: null,
    },
    bloodPressure: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    possibleCategory: {
      type: String,
      trim: true,
      required: true,
    },
    possibleIllness: {
      type: String,
      trim: true,
      default: "",
    },
    recommendedSpecialty: {
      type: String,
      trim: true,
      required: true,
    },
    urgency: {
      type: String,
      trim: true,
      required: true,
    },
    advice: {
      type: String,
      trim: true,
      required: true,
    },
    precautions: {
      type: [String],
      default: [],
    },
    disclaimer: {
      type: String,
      trim: true,
      default: "This is a preliminary symptom check and not a medical diagnosis.",
    },
  },
  {
    timestamps: true,
    collection: "symptom_checks",
  }
);

module.exports = mongoose.model("SymptomCheck", symptomCheckSchema);
