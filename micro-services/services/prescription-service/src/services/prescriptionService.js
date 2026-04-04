const Prescription = require('../models/Prescription');
const ApiError = require('../utils/ApiError');
const { assertDoctorExists } = require('./doctorServiceClient');
const { generatePrescriptionPdf } = require('./pdfService');

async function createPrescription(payload) {
  await assertDoctorExists(payload.doctorId);
  if (!payload.medicines || payload.medicines.length === 0) {
    throw new ApiError(400, 'At least one medicine is required');
  }
  const prescription = await Prescription.create(payload);

  const { filePath, pdfUrl } = await generatePrescriptionPdf(prescription);
  prescription.pdfPath = filePath;
  prescription.pdfUrl = pdfUrl;
  await prescription.save();

  return prescription;
}

async function getPrescriptionsByPatient(patientId) {
  const prescriptions = await Prescription.find({ patientId }).sort({ createdAt: -1 });
  return prescriptions;
}

async function getPrescriptionsByDoctor(doctorId) {
  const prescriptions = await Prescription.find({ doctorId }).sort({ createdAt: -1 });
  return prescriptions;
}

module.exports = {
  createPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor
};
