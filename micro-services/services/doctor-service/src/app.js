const express = require('express');
const cors = require('cors');
const doctorRoutes = require('./routes/doctorRoutes');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'doctor-service' });
});

// Routes
app.use(doctorRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
