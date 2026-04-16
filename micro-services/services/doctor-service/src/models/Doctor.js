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
    _id: { type: String, required: true },
    externalRef: { type: String, trim: true, unique: true, sparse: true },
    uniqueId: { type: String, trim: true, unique: true, sparse: true },
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
    status: {
      type: String,
      enum: ['pending', 'active', 'verified', 'inactive', 'suspended', 'deactivated'],
      default: 'active'
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    availability: { type: [availabilitySchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
