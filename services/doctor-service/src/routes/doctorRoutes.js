const express = require('express');
const { body, param } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const { validate } = require('../utils/validate');

const router = express.Router();

router.post(
  '/api/doctors',
  [
    body('name').isString().trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('specialization').isString().trim().notEmpty(),
    body('experience').isInt({ min: 0 }).toInt()
  ],
  validate,
  doctorController.registerDoctor
);

router.get(
  '/api/doctors/:id',
  [param('id').isString().trim().notEmpty()],
  validate,
  doctorController.getDoctorById
);

router.put(
  '/api/doctors/:id',
  [
    param('id').isString().trim().notEmpty(),
    body('name').optional().isString().trim().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('specialization').optional().isString().trim().notEmpty(),
    body('experience').optional().isInt({ min: 0 }).toInt()
  ],
  validate,
  doctorController.updateDoctor
);

router.post(
  '/api/doctors/:id/availability',
  [
    param('id').isString().trim().notEmpty(),
    body('day').isString().trim().notEmpty(),
    body('slots').isArray({ min: 1 }),
    body('slots.*.start').isString().trim().notEmpty(),
    body('slots.*.end').isString().trim().notEmpty()
  ],
  validate,
  doctorController.addAvailability
);

router.get(
  '/api/doctors/:id/next-available-slot',
  [param('id').isString().trim().notEmpty()],
  validate,
  doctorController.getNextAvailableSlot
);

router.get(
  '/api/doctors/:id/availability',
  [param('id').isString().trim().notEmpty()],
  validate,
  doctorController.getAvailability
);

router.get(
  '/api/doctors/:doctorId/patient-summary/:patientId',
  [
    param('doctorId').isString().trim().notEmpty(),
    param('patientId').isString().trim().notEmpty()
  ],
  validate,
  doctorController.getPatientSummary
);

module.exports = router;
