const mongoose = require("mongoose");

const availabilityItemSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ["online", "physical"],
      default: "physical",
    },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
      default: "",
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    hospitalOrClinic: {
      type: String,
      trim: true,
      default: "",
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    availability: {
      type: [availabilityItemSchema],
      default: [],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "doctor_profiles",
  }
);

module.exports = mongoose.model("DoctorProfile", doctorProfileSchema);
