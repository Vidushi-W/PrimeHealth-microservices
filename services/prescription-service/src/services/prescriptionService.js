const Prescription = require('../models/Prescription');
const ApiError = require('../utils/ApiError');
const { assertDoctorExists } = require('./doctorServiceClient');

async function createPrescription(payload) {
  await assertDoctorExists(payload.doctorId);
  if (!payload.medicines || payload.medicines.length === 0) {
    throw new ApiError(400, 'At least one medicine is required');
  }
  const prescription = await Prescription.create(payload);
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
