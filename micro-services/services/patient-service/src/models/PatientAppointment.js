const mongoose = require("mongoose");

const patientAppointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  {
    timestamps: true,
    collection: "patient_appointments",
  }
);

module.exports = mongoose.model("PatientAppointment", patientAppointmentSchema);
