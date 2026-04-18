const express = require('express');
const {
  notifyAppointmentBooked,
  notifyConsultationCompleted
} = require('../services/notificationService');

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notifications fetched',
    data: []
  });
});

router.post('/', (req, res) => {
  const payload = req.body || {};

  res.status(201).json({
    success: true,
    message: 'Notification accepted',
    data: {
      id: `notif_${Date.now()}`,
      ...payload
    }
  });
});

router.post('/events/appointment-booked', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = await notifyAppointmentBooked(payload);
    res.status(200).json({
      success: true,
      message: 'Appointment booked notifications processed',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/events/consultation-completed', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = await notifyConsultationCompleted(payload);
    res.status(200).json({
      success: true,
      message: 'Consultation completed notifications processed',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
