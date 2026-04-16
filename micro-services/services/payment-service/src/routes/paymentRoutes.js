const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const validate = require('../utils/validate');
const { parseAuthHeaders, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(parseAuthHeaders);

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate a new payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - patientId
 *               - amount
 *             properties:
 *               appointmentId:
 *                 type: string
 *               patientId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *                 enum: [CREDIT_CARD, CASH, INSURANCE]
 *     responses:
 *       201:
 *         description: Payment initiated
 *       409:
 *         description: Payment already exists
 */
router.post(
  '/initiate',
  [
    body('appointmentId').notEmpty().withMessage('Appointment ID is required'),
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('amount').isNumeric().withMessage('Amount must be a number')
  ],
  validate,
  paymentController.initiatePayment
);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm a pending payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Payment failed
 */
router.post(
  '/confirm',
  [
    body('orderId').notEmpty().withMessage('Order ID is required')
  ],
  validate,
  paymentController.confirmPayment
);

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get current patient's payments
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Patient's payment list
 */
router.get('/my', requireRole('PATIENT'), paymentController.getPayments);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments (Admin)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: List of all payments
 */
router.get('/', requireRole('ADMIN', 'PATIENT'), paymentController.getPayments);

/**
 * @swagger
 * /api/payments/order/{orderId}:
 *   get:
 *     summary: Get payment by Order ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/order/:orderId', paymentController.getPaymentByOrderId);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/:id', requireRole('ADMIN', 'PATIENT'), paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Process a refund
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund successful
 */
router.post('/:id/refund', requireRole('ADMIN'), paymentController.processRefund);

/**
 * @swagger
 * /api/payments/{id}/invoice:
 *   get:
 *     summary: Download invoice PDF
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file stream
 */
router.get('/:id/invoice', requireRole('ADMIN', 'PATIENT'), paymentController.downloadInvoice);

module.exports = router;
