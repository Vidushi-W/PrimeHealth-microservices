const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
}

export async function getPatientHome(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/home`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
}

export async function getBookableDoctors(token, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const response = await fetch(`${API_BASE_URL}/api/patients/doctors?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
}

export async function getDoctorSlots(token, doctorId, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const response = await fetch(`${API_BASE_URL}/api/patients/doctors/${doctorId}/slots?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
}

export async function getMyAppointments(token) {
  const response = await fetch(`${API_BASE_URL}/api/patients/appointments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(response);
}

export async function createAppointment(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/patients/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}
