const adminAnalyticsService = require('../services/adminAnalyticsService');

async function getAnalyticsSummary(req, res) {
  try {
    const summary = await adminAnalyticsService.fetchSummary();
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics summary',
      error: error.message
    });
  }
}

async function getAppointmentAnalytics(req, res) {
  try {
    const analytics = await adminAnalyticsService.fetchAppointmentAnalytics();
    return res.json(analytics);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment analytics',
      error: error.message
    });
  }
}

module.exports = {
  getAnalyticsSummary,
  getAppointmentAnalytics
};
