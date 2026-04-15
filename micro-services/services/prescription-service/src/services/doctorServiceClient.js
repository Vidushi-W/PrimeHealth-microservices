const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.DOCTOR_SERVICE_URL || 'http://localhost:5002';
}

async function assertDoctorExists(doctorId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/api/doctors/${doctorId}`;

  try {
    await axios.get(url, {
      timeout: 5000,
      headers: {
        // propagate caller auth if present (optional)
        'x-user-id': 'prescription-service',
        'x-user-role': 'service'
      }
    });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) throw new ApiError(404, 'Doctor not found');
    if (status === 400) throw new ApiError(400, 'Invalid doctor id');
    throw new ApiError(502, 'Failed to validate doctor with doctor-service');
  }
}

module.exports = { assertDoctorExists };
