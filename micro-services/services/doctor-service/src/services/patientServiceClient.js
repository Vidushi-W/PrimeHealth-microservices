const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.PATIENT_SERVICE_URL || 'http://localhost:5001';
}

async function fetchPatientSummary(patientId) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/internal/patients/${patientId}/summary`;

  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || 'Failed to fetch patient summary from patient-service';
    throw new ApiError(statusCode, message);
  }
}

module.exports = { fetchPatientSummary };
