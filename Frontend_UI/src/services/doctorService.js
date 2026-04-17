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

export async function updateAvailabilitySlot(doctorId, payload) {
  const response = await api.put(`/api/doctors/${doctorId}/availability/slots`, payload);
  return response.data.data;
}

export async function deleteAvailabilitySlot(doctorId, payload) {
  const response = await api.delete(`/api/doctors/${doctorId}/availability/slots`, {
    data: payload
  });
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

export async function uploadDoctorProfilePicture(doctorId, file) {
  const formData = new FormData();
  formData.append('profilePicture', file);

  const response = await api.post(`/api/doctors/${doctorId}/profile-picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.data;
}

export async function fetchDoctorUpcomingAppointments(doctorId, limit = 10) {
  const response = await api.get(`/api/doctors/${doctorId}/upcoming-appointments`, {
    params: { limit }
  });
  return response.data.data || [];
}

export async function fetchDoctorPatientReports(doctorId, limit = 25) {
  const response = await api.get(`/api/doctors/${doctorId}/patient-reports`, {
    params: { limit }
  });
  return response.data.data || [];
}

export async function fetchDoctorReviews(doctorId) {
  const response = await api.get(`/api/doctors/${doctorId}/reviews`);
  return response.data.data || { averageRating: 0, totalRatings: 0, reviews: [] };
}

export async function submitDoctorReview(doctorId, payload) {
  const response = await api.post(`/api/doctors/${doctorId}/reviews`, payload);
  return response.data.data;
}

export async function fetchDoctorEarnings(doctorId) {
  const response = await api.get(`/api/doctors/${doctorId}/earnings`);
  return response.data.data || {
    totalEarnings: 0,
    currentMonthEarnings: 0,
    completedPaidConsultations: 0,
    monthlyHistory: []
  };
}

export async function fetchDoctorNotifications(doctorId, limit = 30) {
  const response = await api.get(`/api/doctors/${doctorId}/notifications`, {
    params: { limit }
  });
  return response.data.data || [];
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
