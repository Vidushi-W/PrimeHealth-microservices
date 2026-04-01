const prescriptionService = require('../services/prescriptionService');

async function createPrescription(req, res, next) {
  try {
    const prescription = await prescriptionService.createPrescription(req.body);
    res.status(201).json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
}

async function getByPatient(req, res, next) {
  try {
    const prescriptions = await prescriptionService.getPrescriptionsByPatient(
      req.params.patientId
    );
    res.status(200).json({ success: true, data: prescriptions });
  } catch (err) {
    next(err);
  }
}

async function getByDoctor(req, res, next) {
  try {
    const prescriptions = await prescriptionService.getPrescriptionsByDoctor(
      req.params.doctorId
    );
    res.status(200).json({ success: true, data: prescriptions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPrescription,
  getByPatient,
  getByDoctor
};
