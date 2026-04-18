const swaggerJSDoc = require('swagger-jsdoc');

function buildSwaggerSpec() {
  const port = Number(process.env.PORT) || 5002;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Doctor Service API',
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
 *   - name: Doctors
 *
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/doctors:
 *   get:
 *     tags: [Doctors]
 *     summary: List doctors
 *     parameters:
 *       - in: query
 *         name: specialization
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags: [Doctors]
 *     summary: Register doctor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, specialization, experience]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               specialization: { type: string }
 *               experience: { type: integer }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/doctors/{id}:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *   put:
 *     tags: [Doctors]
 *     summary: Update doctor
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
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/doctors/{id}/availability:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor availability
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     tags: [Doctors]
 *     summary: Add availability slots or generate them from a time range
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
 *             required: [day, slotDuration]
 *             properties:
 *               day: { type: string }
 *               slotDuration: { type: integer, example: 30 }
 *               rangeStart: { type: string, example: "09:00" }
 *               rangeEnd: { type: string, example: "12:00" }
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [start, end]
 *                   properties:
 *                     start: { type: string, example: "09:00" }
 *                     end: { type: string, example: "09:30" }
 *                     status: { type: string, enum: [available, booked] }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/doctors/{id}/availability/slot-status:
 *   patch:
 *     tags: [Doctors]
 *     summary: Update a slot to available or booked
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
 *             required: [day, start, end, status]
 *             properties:
 *               day: { type: string, example: "Monday" }
 *               start: { type: string, example: "09:00" }
 *               end: { type: string, example: "09:30" }
 *               status: { type: string, enum: [available, booked] }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/doctors/{id}/next-available-slot:
 *   get:
 *     tags: [Doctors]
 *     summary: Get next available slot
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/doctors/{doctorId}/patient-summary/{patientId}:
 *   get:
 *     tags: [Doctors]
 *     summary: Get patient prescription insights for a doctor
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
