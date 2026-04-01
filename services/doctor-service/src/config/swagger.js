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
 *     summary: Add availability slots
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
 *             required: [day, slots]
 *             properties:
 *               day: { type: string }
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [start, end]
 *                   properties:
 *                     start: { type: string, example: "09:00" }
 *                     end: { type: string, example: "10:00" }
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
 *     summary: Get patient summary for a doctor (mock info + prescriptions)
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
