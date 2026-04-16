const swaggerJSDoc = require('swagger-jsdoc');

function buildSwaggerSpec() {
  const port = Number(process.env.PORT) || 5003;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Appointment Service API',
        version: '1.0.0'
      },
      servers: [{ url: baseUrl }]
    },
    apis: [__filename]
  };

  return swaggerJSDoc(options);
}

module.exports = buildSwaggerSpec;

/**
 * @openapi
 * tags:
 *   - name: Health
 *   - name: Appointments
 *
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Create appointment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, doctorName, appointmentDate, startTime, endTime]
 *             properties:
 *               doctorId: { type: string }
 *               doctorName: { type: string }
 *               specialty: { type: string }
 *               appointmentDate: { type: string, format: date }
 *               startTime: { type: string, example: "09:00" }
 *               endTime: { type: string, example: "09:30" }
 *               reason: { type: string }
 *               consultationFee: { type: number }
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     tags: [Appointments]
 *     summary: List all appointments (admin)
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/my:
 *   get:
 *     tags: [Appointments]
 *     summary: Get my appointments
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/{id}/cancel:
 *   patch:
 *     tags: [Appointments]
 *     summary: Cancel appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/{id}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Update appointment status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED] }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/doctor/{doctorId}/slots:
 *   get:
 *     tags: [Appointments]
 *     summary: Get available slots for a doctor on a date
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/{id}/queue:
 *   get:
 *     tags: [Appointments]
 *     summary: Get queue position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/appointments/{id}/payment-status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Update payment status (internal)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus: { type: string, enum: [UNPAID, PENDING, PAID, FAILED, REFUNDED] }
 *               paymentId: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
