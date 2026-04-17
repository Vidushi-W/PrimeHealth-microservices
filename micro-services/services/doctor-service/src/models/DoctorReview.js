const mongoose = require('mongoose');

const doctorReviewSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, trim: true, index: true },
    patientId: { type: String, required: true, trim: true, index: true },
    patientName: { type: String, trim: true, default: '' },
    appointmentId: { type: String, trim: true, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

doctorReviewSchema.index(
  { doctorId: 1, patientId: 1, appointmentId: 1 },
  { unique: true }
);

module.exports = mongoose.model('DoctorReview', doctorReviewSchema);
