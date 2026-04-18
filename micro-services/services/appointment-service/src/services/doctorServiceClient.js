const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.DOCTOR_SERVICE_URL || 'http://localhost:5002';
}

async function fetchDoctorById(doctorId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/api/doctors/${doctorId}`;

  try {
    const resp = await axios.get(url, { timeout: 5000 });
    return resp.data?.data || null;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new ApiError(404, 'Doctor not found');
    }
    throw new ApiError(502, 'Failed to fetch doctor from doctor-service');
  }
}

module.exports = { fetchDoctorById };
