const axios = require('axios');

function getPatientServiceBaseUrl() {
  return (process.env.PATIENT_SERVICE_URL || 'http://localhost:5001').replace(/\/+$/, '');
}

function getInternalHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    headers['x-internal-service-token'] = process.env.INTERNAL_SERVICE_TOKEN;
  }
  return headers;
}

async function syncPatientAppointmentStatus(externalAppointmentId, payload) {
  if (!externalAppointmentId) return null;

  const baseUrl = getPatientServiceBaseUrl();
  const url = `${baseUrl}/api/internal/appointments/${encodeURIComponent(externalAppointmentId)}/sync-status`;

  try {
    const { data } = await axios.patch(url, payload, {
      headers: getInternalHeaders(),
      timeout: 5000
    });
    return data?.data || null;
  } catch (error) {
    console.error('[appointment-service] syncPatientAppointmentStatus failed', {
      url,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    return null;
  }
}

module.exports = {
  syncPatientAppointmentStatus
};
