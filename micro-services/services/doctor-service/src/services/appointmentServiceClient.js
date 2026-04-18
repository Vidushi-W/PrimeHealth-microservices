const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5003';
}

async function fetchDoctorAppointments(doctorId, limit = 20) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/appointments`;

  try {
    const { data } = await axios.get(url, {
      params: { doctorId, page: 1, limit },
      headers: {
        'x-user-id': doctorId,
        'x-user-role': 'DOCTOR'
      }
    });

    const payload = data?.data;
    if (Array.isArray(payload?.appointments)) {
      return payload.appointments;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    return [];
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || 'Failed to fetch appointments from appointment-service';
    throw new ApiError(statusCode, message);
  }
}

module.exports = { fetchDoctorAppointments };
