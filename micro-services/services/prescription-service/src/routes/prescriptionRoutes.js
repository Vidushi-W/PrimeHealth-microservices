const express = require('express');
const { body, param } = require('express-validator');
const prescriptionController = require('../controllers/prescriptionController');
const { validate } = require('../utils/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');

const router = express.Router();

function requirePatientScope(req, _res, next) {
  if (!req.user || !req.user.id || !req.user.role) {
    return next(new ApiError(401, 'Missing authentication headers'));
  }

  const role = String(req.user.role || '').trim().toLowerCase();
  if (role === 'doctor' || role === 'service') {
    return next();
  }

  if (role === 'patient' && String(req.user.id) === String(req.params.patientId)) {
    return next();
  }

  return next(new ApiError(403, 'Forbidden: cannot access another patient\'s prescriptions'));
}

function requireDoctorScope(req, _res, next) {
  if (!req.user || !req.user.id || !req.user.role) {
    return next(new ApiError(401, 'Missing authentication headers'));
  }

  const role = String(req.user.role || '').trim().toLowerCase();
  if (role === 'doctor' || role === 'service') {
    return next();
  }

  return next(new ApiError(403, 'Forbidden: doctor access required'));
}

router.post(
  '/api/prescriptions',
  [
    body('doctorId').isString().trim().notEmpty(),
    body('patientId').isString().trim().notEmpty(),
    body('appointmentId').isString().trim().notEmpty(),
    body('diagnosis').isString().trim().notEmpty(),
    body('medicines').isArray({ min: 1 }),
    body('medicines.*.name').isString().trim().notEmpty(),
    body('medicines.*.dosage').isString().trim().notEmpty(),
    body('medicines.*.duration').isString().trim().notEmpty(),
    body('notes').optional().isString().trim()
  ],
  validate,
  requireRole('doctor'),
  prescriptionController.createPrescription
);

router.get(
  '/api/prescriptions/patient/:patientId',
  [param('patientId').isString().trim().notEmpty()],
  validate,
  requireAuth,
  requirePatientScope,
  prescriptionController.getByPatient
);

router.get(
  '/api/prescriptions/doctor/:doctorId',
  [param('doctorId').isString().trim().notEmpty()],
  validate,
  requireAuth,
  requireDoctorScope,
  prescriptionController.getByDoctor
);

module.exports = router;
