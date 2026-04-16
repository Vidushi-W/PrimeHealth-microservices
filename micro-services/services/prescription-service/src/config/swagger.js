const swaggerJSDoc = require('swagger-jsdoc');

function buildSwaggerSpec() {
  const port = Number(process.env.PORT) || 5003;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Prescription Service API',
        version: '1.0.0'
      },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: {
          UserHeaders: {
            type: 'apiKey',
            in: 'header',
            name: 'x-user-id'
          },
          RoleHeaders: {
            type: 'apiKey',
            in: 'header',
            name: 'x-user-role'
          }
        }
      }
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
 *   - name: Prescriptions
 *
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/prescriptions:
 *   post:
 *     tags: [Prescriptions]
 *     summary: Create a prescription (doctor role required)
 *     security:
 *       - UserHeaders: []
 *       - RoleHeaders: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, patientId, appointmentId, diagnosis, medicines]
 *             properties:
 *               doctorId: { type: string }
 *               patientId: { type: string }
 *               appointmentId: { type: string }
 *               diagnosis: { type: string }
 *               notes: { type: string }
 *               medicines:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [name, dosage, duration]
 *                   properties:
 *                     name: { type: string }
 *                     dosage: { type: string }
 *                     duration: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/prescriptions/patient/{patientId}:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Get prescriptions by patient
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/prescriptions/doctor/{doctorId}:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Get prescriptions by doctor
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
