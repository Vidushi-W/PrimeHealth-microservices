const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, trim: true }, // e.g. "09:00"
    end: { type: String, required: true, trim: true } // e.g. "12:00"
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true }, // e.g. "Monday"
    slots: { type: [availabilitySlotSchema], default: [] }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
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
