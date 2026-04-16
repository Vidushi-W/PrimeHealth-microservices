const mongoose = require('mongoose');

const APPOINTMENT_STATUS = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const PAYMENT_STATUS = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, trim: true },
    doctorId: { type: String, required: true, trim: true },
    doctorName: { type: String, required: true, trim: true },
    specialty: { type: String, trim: true, default: '' },
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },   // e.g. "09:00"
    endTime: { type: String, required: true, trim: true },     // e.g. "09:30"
    reason: { type: String, trim: true, default: '' },
    consultationFee: { type: Number, default: 0, min: 0 },
    queueNumber: { type: Number, default: 0 },
    status: {
      type: String,
      enum: APPOINTMENT_STATUS,
      default: 'PENDING'
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'UNPAID'
    },
    paymentId: { type: String, default: null },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate bookings for same doctor/date/time
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'CANCELLED' } }
  }
);

// Index for quick patient lookup
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });

// Index for doctor schedule queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.APPOINTMENT_STATUS = APPOINTMENT_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
