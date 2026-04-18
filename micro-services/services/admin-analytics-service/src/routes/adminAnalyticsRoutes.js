const express = require('express');
const auth = require('../middleware/auth');
const { requirePermission } = auth;
const {
  getAnalyticsSummary,
  getAppointmentAnalytics
} = require('../controllers/adminAnalyticsController');

const router = express.Router();

router.get('/summary', auth, requirePermission('analytics.read'), getAnalyticsSummary);
router.get('/appointments', auth, requirePermission('analytics.read'), getAppointmentAnalytics);

module.exports = router;
