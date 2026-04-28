const Prescription = require('../models/Prescription');
const ApiError = require('../utils/ApiError');
const { assertDoctorExists } = require('./doctorServiceClient');
const {
  buildPdfFileName,
  generatePrescriptionPdf,
  getPdfFilePath,
  parsePrescriptionIdFromFileName
} = require('./pdfService');
const fs = require('fs');

function normalizePrescriptionPayload(payload = {}) {
  return {
    doctorId: String(payload.doctorId || '').trim(),
    patientId: String(payload.patientId || '').trim(),
    appointmentId: String(payload.appointmentId || '').trim(),
    diagnosis: String(payload.diagnosis || '').trim(),
    notes: String(payload.notes || '').trim(),
    medicines: Array.isArray(payload.medicines)
      ? payload.medicines.map((item) => ({
        name: String(item?.name || '').trim(),
        dosage: String(item?.dosage || '').trim(),
        duration: String(item?.duration || '').trim()
      }))
      : []
  };
}

function dedupeLatestByAppointment(prescriptions = []) {
  const latestByAppointment = new Map();

  prescriptions.forEach((item) => {
    const key = `${String(item?.patientId || '').trim()}::${String(item?.appointmentId || '').trim()}`;
    const existing = latestByAppointment.get(key);
    const itemTime = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
    const existingTime = new Date(existing?.updatedAt || existing?.createdAt || 0).getTime();

    if (!existing || itemTime >= existingTime) {
      latestByAppointment.set(key, item);
    }
  });

  return Array.from(latestByAppointment.values()).sort(
    (left, right) => new Date(right?.updatedAt || right?.createdAt || 0) - new Date(left?.updatedAt || left?.createdAt || 0)
  );
}

async function createPrescription(payload) {
  const normalized = normalizePrescriptionPayload(payload);

  await assertDoctorExists(normalized.doctorId);
  if (!normalized.medicines.length) {
    throw new ApiError(400, 'At least one medicine is required');
  }

  const existingRecords = await Prescription.find({
    patientId: normalized.patientId,
    appointmentId: normalized.appointmentId
  }).sort({ updatedAt: -1, createdAt: -1 });

  let prescription = existingRecords.find((item) => item.isActive !== false) || existingRecords[0] || null;

  if (prescription) {
    const previousVersion = Number(prescription.version || 1);
    prescription.doctorId = normalized.doctorId;
    prescription.patientId = normalized.patientId;
    prescription.appointmentId = normalized.appointmentId;
    prescription.diagnosis = normalized.diagnosis;
    prescription.notes = normalized.notes;
    prescription.medicines = normalized.medicines;
    prescription.version = previousVersion + 1;
    prescription.isActive = true;
    prescription.archivedAt = null;
    await prescription.save();
  } else {
    prescription = await Prescription.create({
      ...normalized,
      version: 1,
      isActive: true,
      archivedAt: null
    });
  }

  const supersededIds = existingRecords
    .filter((item) => String(item._id) !== String(prescription._id))
    .map((item) => item._id);

  if (supersededIds.length) {
    await Prescription.updateMany(
      { _id: { $in: supersededIds } },
      {
        $set: {
          isActive: false,
          archivedAt: new Date()
        }
      }
    );
  }

  const { filePath, pdfUrl } = await generatePrescriptionPdf(prescription);
  prescription.pdfPath = filePath;
  prescription.pdfUrl = pdfUrl;
  await prescription.save();

  return prescription;
}

async function getPrescriptionsByPatient(patientId) {
  const prescriptions = await Prescription.find({ patientId, isActive: true }).sort({ updatedAt: -1, createdAt: -1 });
  return dedupeLatestByAppointment(prescriptions);
}

async function getPrescriptionsByDoctor(doctorId) {
  const prescriptions = await Prescription.find({ doctorId, isActive: true }).sort({ updatedAt: -1, createdAt: -1 });
  return dedupeLatestByAppointment(prescriptions);
}

async function ensurePrescriptionPdfForRecord(prescription) {
  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  const expectedFileName = buildPdfFileName(prescription._id);
  const expectedFilePath = getPdfFilePath(expectedFileName);
  if (fs.existsSync(expectedFilePath)) {
    if (prescription.pdfPath !== expectedFilePath) {
      prescription.pdfPath = expectedFilePath;
      await prescription.save();
    }
    return prescription;
  }

  const { filePath, pdfUrl } = await generatePrescriptionPdf(prescription);
  prescription.pdfPath = filePath;
  prescription.pdfUrl = pdfUrl;
  await prescription.save();
  return prescription;
}

async function getPrescriptionPdfByFileName(fileName) {
  const prescriptionId = parsePrescriptionIdFromFileName(fileName);
  if (!prescriptionId) {
    throw new ApiError(404, 'Prescription file not found');
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  return ensurePrescriptionPdfForRecord(prescription);
}

module.exports = {
  createPrescription,
  ensurePrescriptionPdfForRecord,
  getPrescriptionPdfByFileName,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor
};
