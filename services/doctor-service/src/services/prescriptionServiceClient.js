const axios = require('axios');
const ApiError = require('../utils/ApiError');

function getBaseUrl() {
  return process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:5003';
}

async function fetchPrescriptionsByPatient(patientId) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, '')}/api/prescriptions/patient/${patientId}`;

  try {
    const resp = await axios.get(url, { timeout: 5000 });
    return resp.data?.data || [];
  } catch (err) {
    throw new ApiError(502, 'Failed to fetch prescriptions from prescription-service');
  }
}

module.exports = { fetchPrescriptionsByPatient };
