const axios = require('axios');

function getBaseUrl() {
  return process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5003';
}

async function createCentralAppointment(payload) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/appointments`;

  const { data } = await axios.post(url, payload.body, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': payload.patientId,
      'x-user-role': 'PATIENT',
      'x-user-full-name': payload.patientName || payload.body?.patientName || ''
    }
  });

  return data?.data || null;
}

module.exports = {
  createCentralAppointment
};
