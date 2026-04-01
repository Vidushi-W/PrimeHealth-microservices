const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const prescriptionRoutes = require('./routes/prescriptionRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { parseAuthHeaders } = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(parseAuthHeaders);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

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
