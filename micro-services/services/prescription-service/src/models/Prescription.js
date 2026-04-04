const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, trim: true },
    patientId: { type: String, required: true, trim: true },
    appointmentId: { type: String, required: true, trim: true },
    diagnosis: { type: String, required: true, trim: true },
    medicines: { type: [medicineSchema], default: [] },
    notes: { type: String, trim: true },
    pdfPath: { type: String, trim: true },
    pdfUrl: { type: String, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
