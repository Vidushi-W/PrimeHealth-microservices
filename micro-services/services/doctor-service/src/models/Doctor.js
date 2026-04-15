const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, trim: true }, // e.g. "09:00"
    end: { type: String, required: true, trim: true }, // e.g. "09:30"
    status: {
      type: String,
      enum: ['available', 'booked'],
      default: 'available'
    }
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true }, // e.g. "Monday"
    slotDuration: { type: Number, required: true, min: 5 },
    slots: { type: [availabilitySlotSchema], default: [] }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
    availability: { type: [availabilitySchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
