import api from './api';

export async function getDoctors(params = {}) {
  const response = await api.get('/api/doctors', { params });
  return response.data.data;
}

export async function getDoctorById(doctorId) {
  const response = await api.get(`/api/doctors/${doctorId}`);
  return response.data.data;
}

export async function updateDoctor(doctorId, payload) {
  const response = await api.put(`/api/doctors/${doctorId}`, payload);
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

export function summarizeDoctorAppointments(doctor) {
  const availability = doctor?.availability || [];
  const bookedSlots = availability.flatMap((day) =>
    (day.slots || [])
      .filter((slot) => slot.status === 'booked')
      .map((slot) => ({
        day: day.day,
        start: slot.start,
        end: slot.end,
        status: slot.status
      }))
  );

  return {
    total: bookedSlots.length,
    upcoming: bookedSlots.length,
    completed: 0,
    recent: bookedSlots.slice(0, 5),
    source: 'availability'
  };
}
