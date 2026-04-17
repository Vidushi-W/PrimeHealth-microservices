const API_BASE_URL = import.meta.env.VITE_PATIENT_API_URL || 'http://localhost:5007';
const ACTIVE_PROFILE_STORAGE_KEY = 'primeHealthActiveProfileId';

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY) || '';
}

export function setActiveProfileId(profileId) {
  if (!profileId) {
    localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
}

function buildAuthHeaders(token, includeProfile = true) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeProfile) {
    const activeProfileId = getActiveProfileId();
    if (activeProfileId) {
      headers['x-profile-id'] = activeProfileId;
    }
  }

  return headers;
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export const registerPatient = registerUser;
export const loginPatient = loginUser;

export async function getMyProfile(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/me`, {
    headers: buildAuthHeaders(token, false),
  });

  return parseResponse(response);
}

export async function getPatientHome(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/home`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getPatientTimeline(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/timeline`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getBookableDoctors(token, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const response = await fetch(`${API_BASE_URL}/api/patients/doctors?${query.toString()}`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getDoctorSlots(token, doctorId, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const response = await fetch(`${API_BASE_URL}/api/patients/doctors/${doctorId}/slots?${query.toString()}`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getMyAppointments(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/appointments`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getPatientReports(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reports`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function uploadPatientReport(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function analyzePatientReport(token, reportId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reports/${reportId}/analyze`, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(token),
    },
  });

  return parseResponse(response);
}

export async function deletePatientReport(token, reportId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reports/${reportId}`, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(token),
    },
  });

  return parseResponse(response);
}

export async function checkSymptoms(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/symptoms/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function calculateRiskScore(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/risk-score/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function getRiskScoreHistory(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/risk-score/history`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getReminders(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function getUpcomingReminders(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders/upcoming`, {
    headers: buildAuthHeaders(token),
  });

  return parseResponse(response);
}

export async function createReminder(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function updateReminder(token, reminderId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders/${reminderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function markReminderDone(token, reminderId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders/${reminderId}/mark-done`, {
    method: 'PATCH',
    headers: {
      ...buildAuthHeaders(token),
    },
  });

  return parseResponse(response);
}

export async function deleteReminder(token, reminderId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/reminders/${reminderId}`, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(token),
    },
  });

  return parseResponse(response);
}

export async function createAppointment(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function updateMyProfile(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token, false),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function getFamilyProfiles(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/profiles`, {
    headers: buildAuthHeaders(token, false),
  });

  return parseResponse(response);
}

export async function createFamilyProfile(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token, false),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function updateFamilyProfile(token, profileId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/profiles/${profileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token, false),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function deleteFamilyProfile(token, profileId) {
  const response = await fetch(`${API_BASE_URL}/api/patients/profiles/${profileId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(token, false),
  });

  return parseResponse(response);
}
