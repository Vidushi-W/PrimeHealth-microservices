const axios = require('axios');

function getBaseUrl() {
  return process.env.PATIENT_SERVICE_URL || 'http://localhost:5001';
}

async function fetchPatientSummary(patientId) {
  const baseUrl = getBaseUrl();
  const safePatientId = encodeURIComponent(String(patientId || '').trim());
  if (!safePatientId) return null;

  const url = `${baseUrl.replace(/\/+$/, '')}/api/internal/patients/${safePatientId}/summary`;

  try {
    const resp = await axios.get(url, { timeout: 5000 });
    return resp.data || null;
  } catch (_error) {
    return null;
  }
}

module.exports = { fetchPatientSummary };