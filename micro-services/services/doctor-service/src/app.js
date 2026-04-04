const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const doctorRoutes = require('./routes/doctorRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { parseAuthHeaders } = require('./middleware/auth');
const requestLogger = require('./middleware/requestLogger');
const buildSwaggerSpec = require('./config/swagger');

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

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    data: { service: 'doctor-service' }
  });
});

app.use(doctorRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
