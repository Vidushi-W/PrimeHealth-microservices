const express = require('express');
const { body, param, query } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const { validate } = require('../utils/validate');

const router = express.Router();

const slotBodyValidator = body().custom((value) => {
  const hasSlots = Array.isArray(value?.slots) && value.slots.length > 0;
  const hasRange = Boolean(value?.rangeStart) && Boolean(value?.rangeEnd);

  if (!hasSlots && !hasRange) {
    throw new Error('Provide either slots or rangeStart and rangeEnd');
  }

  return true;
});

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
  '/api/doctors',
  [query('specialization').optional().isString().trim()],
  validate,
  doctorController.listDoctors
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
    body('slotDuration')
      .isInt({ min: 5, max: 240 })
      .withMessage('slotDuration must be an integer between 5 and 240')
      .toInt(),
    body('rangeStart')
      .optional()
      .isString()
      .trim()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('rangeEnd')
      .optional()
      .isString()
      .trim()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('slots')
      .optional()
      .isArray({ min: 1 })
      .withMessage('slots must be a non-empty array'),
    body('slots.*.start').optional().isString().trim().notEmpty(),
    body('slots.*.end').optional().isString().trim().notEmpty(),
    body('slots.*.status')
      .optional()
      .isIn(['available', 'booked'])
      .withMessage('slot status must be available or booked'),
    slotBodyValidator
  ],
  validate,
  doctorController.addAvailability
);

router.patch(
  '/api/doctors/:id/availability/slot-status',
  [
    param('id').isString().trim().notEmpty(),
    body('day').isString().trim().notEmpty(),
    body('start')
      .isString()
      .trim()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('end')
      .isString()
      .trim()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('status')
      .isIn(['available', 'booked'])
      .withMessage('status must be available or booked')
  ],
  validate,
  doctorController.updateAvailabilitySlotStatus
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
