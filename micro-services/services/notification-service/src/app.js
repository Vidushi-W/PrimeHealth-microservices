const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    data: { service: 'notification-service' }
  });
});

app.use('/api/notifications', notificationRoutes);

app.use((err, _req, res, _next) => {
  const message = err?.message || 'Internal Server Error';
  res.status(500).json({
    success: false,
    message
  });
});

module.exports = app;
