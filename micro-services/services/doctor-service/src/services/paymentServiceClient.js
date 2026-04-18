const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';
}

async function fetchDoctorPayments(doctorId) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/payments/doctor/${doctorId}/summary`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        'x-user-id': doctorId,
        'x-user-role': 'DOCTOR'
      }
    });

    return data?.data || null;
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || 'Failed to fetch payments from payment-service';
    throw new ApiError(statusCode, message);
  }
}

module.exports = { fetchDoctorPayments };
