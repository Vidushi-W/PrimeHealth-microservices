const express = require('express');
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const validate = require('../utils/validate');
const { parseAuthHeaders, requireRole, requireInternalServiceToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth header parsing to all routes
router.use(parseAuthHeaders);

// ─── Patient Endpoints ─────────────────────────────────────

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 */
router.post(
  '/',
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('doctorName').notEmpty().withMessage('Doctor Name is required'),
    body('appointmentDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
    body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:mm format'),
    body('endTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:mm format'),
    body('mode').optional().isIn(['online', 'physical']).withMessage('Mode must be online or physical'),
  ],
  validate,
  appointmentController.createAppointment
);

/**
 * @swagger
 * /api/appointments/my:
 *   get:
 *     summary: Get current patient's appointments
 *     tags: [Appointments]
 */
router.get('/my', requireRole('PATIENT'), appointmentController.getMyAppointments);

/**
 * @swagger
 * /api/appointments/doctor/{doctorId}/slots:
 *   get:
 *     summary: Get available slots for a doctor on a date
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/doctor/:doctorId/slots', appointmentController.getAvailableSlots);

// ─── General Endpoints ──────────────────────────────────────

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments (filtered)
 *     tags: [Appointments]
 */
router.get('/', appointmentController.getAllAppointments);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 */
router.get('/:id', appointmentController.getAppointmentById);

/**
 * @swagger
 * /api/appointments/{id}/queue:
 *   get:
 *     summary: Get live queue position
 *     tags: [Appointments]
 */
router.get('/:id/queue', requireRole('PATIENT'), appointmentController.getQueuePosition);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 */
router.patch('/:id/cancel', requireRole('PATIENT', 'ADMIN'), appointmentController.cancelAppointment);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (Doctor/Admin)
 *     tags: [Appointments]
 */
router.patch(
  '/:id/status',
  requireRole('ADMIN', 'DOCTOR'),
  [
    body('status')
      .isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
      .withMessage('Invalid status')
  ],
  validate,
  appointmentController.updateAppointmentStatus
);

/**
 * @swagger
 * /api/appointments/{id}/payment-status:
 *   patch:
 *     summary: Update payment status (Internal - called by Payment Service)
 *     tags: [Appointments]
 */
router.patch(
  '/:id/payment-status',
  requireInternalServiceToken,
  [
    body('paymentStatus')
      .isIn(['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'])
      .withMessage('Invalid payment status')
  ],
  validate,
  appointmentController.updatePaymentStatus
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Delete an appointment (Admin)
 *     tags: [Appointments]
 */
router.delete('/:id', requireRole('ADMIN'), appointmentController.deleteAppointment);

module.exports = router;
