const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const prescriptionRoutes = require('./routes/prescriptionRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { parseAuthHeaders } = require('./middleware/auth');
const requestLogger = require('./middleware/requestLogger');
const buildSwaggerSpec = require('./config/swagger');
const prescriptionService = require('./services/prescriptionService');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(parseAuthHeaders);
app.use(requestLogger);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(buildSwaggerSpec(), { explorer: true })
);

app.get('/files/prescriptions/:fileName', async (req, res, next) => {
  try {
    const prescription = await prescriptionService.getPrescriptionPdfByFileName(req.params.fileName);
    const filePath = prescription.pdfPath || path.join(process.cwd(), 'storage', 'pdfs', req.params.fileName);
    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
});

app.use('/files/prescriptions', express.static(path.join(process.cwd(), 'storage', 'pdfs')));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    data: { service: 'prescription-service' }
  });
});

app.use(prescriptionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
