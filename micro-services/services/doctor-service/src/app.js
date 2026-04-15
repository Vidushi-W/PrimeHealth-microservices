const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'doctor-service' });
});

// Mock endpoint for appointment service to check availability
app.get('/api/doctors/:id/availability', (req, res) => {
  // Always return true for this mock version
  const { date, time } = req.query;
  res.status(200).json({
    success: true,
    data: {
      doctorId: req.params.id,
      date,
      time,
      isAvailable: true
    }
  });
});

module.exports = app;
