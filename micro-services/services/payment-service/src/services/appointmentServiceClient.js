const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5003';
}

/**
 * Fetch an appointment by ID from appointment-service
 */
async function getAppointment(appointmentId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/api/appointments/${appointmentId}`;

  try {
    const resp = await axios.get(url, { timeout: 5000 });
    return resp.data?.data || null;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new ApiError(404, 'Appointment not found');
    }
    throw new ApiError(502, 'Failed to fetch appointment from appointment-service');
  }
}

/**
 * Update payment status on the appointment (internal call)
 */
async function updatePaymentStatus(appointmentId, data) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/api/appointments/${appointmentId}/payment-status`;

  try {
    const resp = await axios.patch(url, data, { timeout: 5000 });
    return resp.data?.data || null;
  } catch (err) {
    throw new ApiError(502, 'Failed to update appointment payment status');
  }
}

module.exports = { getAppointment, updatePaymentStatus };
