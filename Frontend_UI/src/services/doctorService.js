import api from './api';

export async function getDoctors(params = {}) {
  const response = await api.get('/api/doctors', { params });
  return response.data.data;
}

export async function getDoctorById(doctorId) {
  const response = await api.get(`/api/doctors/${doctorId}`);
  return response.data.data;
}

export async function addAvailability(doctorId, payload) {
  const response = await api.post(`/api/doctors/${doctorId}/availability`, payload);
  return response.data.data;
}

export async function updateSlotStatus(doctorId, payload) {
  const response = await api.patch(`/api/doctors/${doctorId}/availability/slot-status`, payload);
  return response.data.data;
}

export async function getPatientSummary(doctorId, patientId) {
  const response = await api.get(`/api/doctors/${doctorId}/patient-summary/${patientId}`);
  return response.data.data;
}
