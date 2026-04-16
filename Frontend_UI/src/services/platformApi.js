import axios from 'axios';

const API_TIMEOUT_MS = 12000;

const patientApi = axios.create({
  baseURL: import.meta.env.VITE_PATIENT_API_URL || 'http://localhost:5007',
  timeout: API_TIMEOUT_MS
});

const doctorApi = axios.create({
  baseURL: import.meta.env.VITE_DOCTOR_API_URL || 'http://localhost:5002',
  timeout: API_TIMEOUT_MS
});

const appointmentApi = axios.create({
  baseURL: import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:5003',
  timeout: API_TIMEOUT_MS
});

const paymentApi = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5004',
  timeout: API_TIMEOUT_MS
});

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5001',
  timeout: API_TIMEOUT_MS
});

const prescriptionApi = axios.create({
  baseURL: import.meta.env.VITE_PRESCRIPTION_API_URL || 'http://localhost:5005',
  timeout: API_TIMEOUT_MS
});

const telemedicineApi = axios.create({
  baseURL: import.meta.env.VITE_TELEMEDICINE_API_URL || 'http://localhost:5006',
  timeout: API_TIMEOUT_MS
});

export const TELEMEDICINE_BASE_URL =
  import.meta.env.VITE_TELEMEDICINE_API_URL ||
  'http://localhost:5006';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function normalizeRole(role) {
  if (!role) return '';
  return String(role).toUpperCase();
}

function resolveAuthContext(authOrToken) {
  const stored = getStoredAuth() || {};
  const token = typeof authOrToken === 'string' ? authOrToken : authOrToken?.token || stored.token || '';
  const user = typeof authOrToken === 'object' && authOrToken?.user ? authOrToken.user : stored.user || {};
  const userId = user.userId || user.id || user._id || localStorage.getItem('primehealth:userId') || '';
  const role = user.role || localStorage.getItem('primehealth:role') || '';
  return { token, userId, role: normalizeRole(role) };
}

export function authHeaders(authOrToken) {
  const { token, userId, role } = resolveAuthContext(authOrToken);
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;
  if (role) headers['x-user-role'] = role;

  return headers;
}

export async function signIn(credentials) {
  const response = await adminApi.post('/api/auth/login', {
    email: credentials.email,
    password: credentials.password,
    role: credentials.role
  });
  return unwrap(response);
}

export async function signUp(payload) {
  const response = await adminApi.post('/api/auth/register', {
    role: payload.role,
    email: payload.email,
    password: payload.password,
    name: payload.fullName,
    specialty: payload.specialization
  });
  return unwrap(response);
}

export async function fetchDoctors() {
  const response = await doctorApi.get('/api/doctors');
  return unwrap(response) || [];
}

export async function fetchDoctorById(doctorId) {
  const response = await doctorApi.get(`/api/doctors/${doctorId}`);
  return unwrap(response);
}

export async function fetchDoctorAppointments(token) {
  const response = await appointmentApi.get('/api/appointments', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchAllAppointments(token) {
  const response = await appointmentApi.get('/api/appointments', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchPatientAppointments(token) {
  const response = await appointmentApi.get('/api/appointments/my', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function createAppointment(authOrToken, payload) {
  const { userId } = resolveAuthContext(authOrToken);

  const requestBody = {
    patientId: payload.patientId || userId,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName || 'Assigned doctor',
    appointmentDate: payload.appointmentDate,
    startTime: payload.startTime,
    endTime: payload.endTime || payload.startTime,
    mode: payload.mode,
    reason: payload.reason
  };

  const response = await appointmentApi.post('/api/appointments', requestBody, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function fetchPayments(token) {
  const response = await paymentApi.get('/api/payments/my', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchAllPayments(token) {
  const response = await paymentApi.get('/api/payments', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchAdminAnalyticsSummary(token) {
  const response = await adminApi.get('/api/admin/analytics/summary', {
    headers: authHeaders(token)
  });
  return unwrap(response) || null;
}

export async function fetchAdminDoctors(token) {
  const response = await adminApi.get('/api/admin/users/doctors', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchAdminPatients(token) {
  const response = await adminApi.get('/api/admin/users/patients', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function createAdminDoctor(token, payload) {
  const response = await adminApi.post('/api/admin/users/doctors', payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function createAdminPatient(token, payload) {
  const response = await adminApi.post('/api/admin/users/patients', payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function verifyDoctorAccount(token, doctorId) {
  const response = await adminApi.patch(`/api/admin/users/doctors/${doctorId}/verify`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function updateDoctorAccount(token, doctorId, payload) {
  const response = await adminApi.patch(`/api/admin/users/doctor/${doctorId}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function deactivateDoctorAccount(token, doctorId) {
  const response = await adminApi.patch(`/api/admin/users/doctor/${doctorId}/deactivate`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function updatePatientAccount(token, patientId, payload) {
  const response = await adminApi.patch(`/api/admin/users/patient/${patientId}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function fetchAdminAppointmentAnalytics(token) {
  const response = await adminApi.get('/api/admin/analytics/appointments', {
    headers: authHeaders(token)
  });
  return unwrap(response) || null;
}

export async function fetchAdminTransactions(token) {
  const response = await adminApi.get('/api/admin/finance/transactions', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}


export async function fetchTelemedicineSessions(token) {
  const response = await telemedicineApi.get('/telemedicine/sessions', {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchDoctorPrescriptions(token, doctorId) {
  if (!doctorId) return [];

  const response = await prescriptionApi.get(`/api/prescriptions/doctor/${doctorId}`, {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export function getStoredAuth() {
  try {
    const value = localStorage.getItem('primeHealthAuth');
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

export function persistAuth(auth) {
  if (!auth) {
    localStorage.removeItem('primeHealthAuth');
    localStorage.removeItem('primehealth:token');
    localStorage.removeItem('primehealth:role');
    localStorage.removeItem('primehealth:userId');
    return;
  }

  const role = auth.user?.role || '';
  const userId = auth.user?.userId || auth.user?.id || auth.user?._id || '';

  localStorage.setItem('primeHealthAuth', JSON.stringify(auth));
  localStorage.setItem('primehealth:token', auth.token || '');
  localStorage.setItem('primehealth:role', role);
  localStorage.setItem('primehealth:userId', userId);
}

export function normalizeAuthResponse(response) {
  const token = response?.token || response?.accessToken || response?.data?.token || '';
  const role = response?.role || response?.data?.role || '';
  const user = response?.user || response?.data?.user || response?.profile || null;
  const normalizedUser = user ? { ...user, role: user.role || role } : null;
  return { token, user: normalizedUser };
}
