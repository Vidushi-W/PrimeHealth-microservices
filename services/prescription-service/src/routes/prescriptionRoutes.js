const express = require('express');
const { body, param } = require('express-validator');
const prescriptionController = require('../controllers/prescriptionController');
const { validate } = require('../utils/validate');

const router = express.Router();

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
  prescriptionController.createPrescription
);

router.get(
  '/api/prescriptions/patient/:patientId',
  [param('patientId').isString().trim().notEmpty()],
  validate,
  prescriptionController.getByPatient
);

router.get(
  '/api/prescriptions/doctor/:doctorId',
  [param('doctorId').isString().trim().notEmpty()],
  validate,
  prescriptionController.getByDoctor
);

module.exports = router;
