import axios from 'axios';
import {
  API_BASE_ADMIN,
  API_BASE_APPOINTMENT,
  API_BASE_DOCTOR,
  API_BASE_PATIENT,
  API_BASE_PAYMENT,
  API_BASE_PRESCRIPTION,
  API_BASE_TELEMEDICINE
} from '../config/apiBase';

const API_TIMEOUT_MS = 12000;

const patientApi = axios.create({
  baseURL: API_BASE_PATIENT,
  timeout: API_TIMEOUT_MS
});

const doctorApi = axios.create({
  baseURL: API_BASE_DOCTOR,
  timeout: API_TIMEOUT_MS
});

const appointmentApi = axios.create({
  baseURL: API_BASE_APPOINTMENT,
  timeout: API_TIMEOUT_MS
});

const paymentApi = axios.create({
  baseURL: API_BASE_PAYMENT,
  timeout: API_TIMEOUT_MS
});

const adminApi = axios.create({
  baseURL: API_BASE_ADMIN,
  timeout: API_TIMEOUT_MS
});

const prescriptionApi = axios.create({
  baseURL: API_BASE_PRESCRIPTION,
  timeout: API_TIMEOUT_MS
});

const telemedicineApi = axios.create({
  baseURL: API_BASE_TELEMEDICINE,
  timeout: API_TIMEOUT_MS
});

export const TELEMEDICINE_BASE_URL = API_BASE_TELEMEDICINE;

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function unwrapAppointmentCollection(response) {
  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.appointments)) {
    return payload.appointments;
  }

  return [];
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
  const email = user.email || '';
  const uniqueId = user.uniqueId || '';
  const externalRef = user.externalRef || user.adminId || '';
  return { token, userId, role: normalizeRole(role), email, uniqueId, externalRef };
}

export function authHeaders(authOrToken) {
  const { token, userId, role, email, uniqueId, externalRef } = resolveAuthContext(authOrToken);
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = String(userId);
  if (role) headers['x-user-role'] = role;
  if (email) headers['x-user-email'] = email;
  if (uniqueId) headers['x-user-unique-id'] = String(uniqueId);
  if (externalRef) headers['x-user-external-ref'] = String(externalRef);

  return headers;
}

export async function signIn(credentials) {
  const response = await adminApi.post('/api/auth/login', {
    email: credentials.email,
    password: credentials.password
  });
  return unwrap(response);
}

export async function signUp(payload) {
  const response = await adminApi.post('/api/auth/register', {
    role: payload.role,
    email: payload.email,
    password: payload.password,
    name: payload.fullName,
    specialty: payload.specialization,
    phone: payload.phone,
    experience: payload.experience ?? payload.yearsOfExperience
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

export async function fetchDoctorAppointments(authOrToken, filters = {}) {
  const params = {};
  if (filters.status && String(filters.status).toUpperCase() !== 'ALL') {
    params.status = String(filters.status).toUpperCase();
  }
  if (filters.paymentStatus && String(filters.paymentStatus).trim()) {
    params.paymentStatus = String(filters.paymentStatus).toUpperCase();
  }
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const response = await appointmentApi.get('/api/appointments', {
    headers: authHeaders(authOrToken),
    params
  });
  return unwrapAppointmentCollection(response);
}

export async function fetchAllAppointments(token) {
  const response = await appointmentApi.get('/api/appointments', {
    headers: authHeaders(token)
  });
  return unwrapAppointmentCollection(response);
}

export async function fetchPatientAppointments(token) {
  const response = await appointmentApi.get('/api/appointments/my', {
    headers: authHeaders(token)
  });
  return unwrapAppointmentCollection(response);
}

export async function fetchAppointmentById(authOrToken, appointmentId) {
  const response = await appointmentApi.get(`/api/appointments/${appointmentId}`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function cancelAppointment(authOrToken, appointmentId) {
  const response = await appointmentApi.patch(
    `/api/appointments/${appointmentId}/cancel`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(authOrToken)
      }
    }
  );
  return unwrap(response);
}

export async function fetchAppointmentQueue(authOrToken, appointmentId) {
  const response = await appointmentApi.get(`/api/appointments/${appointmentId}/queue`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function updateAppointmentStatus(authOrToken, appointmentId, status) {
  const response = await appointmentApi.patch(
    `/api/appointments/${appointmentId}/status`,
    { status },
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(authOrToken)
      }
    }
  );

  return unwrap(response);
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

export async function initiatePayment(authOrToken, payload) {
  const response = await paymentApi.post(
    '/api/payments/initiate',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(authOrToken)
      }
    }
  );

  return unwrap(response);
}

/**
 * `SIMULATED` (default): local test payment.
 * `STRIPE`: hosted Stripe Checkout session.
 */
export function getConfiguredPaymentProvider() {
  const v = String(import.meta.env.VITE_PAYMENT_PROVIDER || 'STRIPE').trim().toUpperCase();
  return v === 'STRIPE' ? 'STRIPE' : 'SIMULATED';
}

/**
 * @returns {Promise<{ kind: 'stripe', initiated: object } | { kind: 'simulated', initiated: object, confirmed: object }>}
 */
export async function initiatePaymentFlow(authOrToken, payload) {
  const provider = payload.provider || getConfiguredPaymentProvider();
  const initiated = await initiatePayment(authOrToken, { ...payload, provider });

  if (initiated?.checkout?.gateway === 'STRIPE') {
    return { kind: 'stripe', initiated };
  }

  if (provider === 'STRIPE') {
    throw new Error('Stripe payment provider is configured, but checkout session was not returned.');
  }

  const orderId = initiated?.orderId;
  if (!orderId) {
    throw new Error('Payment order was not created');
  }

  const confirmed = await confirmPayment(authOrToken, orderId);
  return { kind: 'simulated', initiated, confirmed };
}

export function submitHostedCheckout(checkout, target = '_self') {
  if (!checkout?.actionUrl || !checkout?.fields) {
    throw new Error('Checkout payload is incomplete.');
  }

  const form = document.createElement('form');
  form.method = checkout.method || 'POST';
  form.action = checkout.actionUrl;
  form.target = target;

  Object.entries(checkout.fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value == null ? '' : String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

export function startStripeCheckout(checkout) {
  const url = String(checkout?.url || '').trim();
  if (!url) {
    throw new Error('Stripe checkout URL is missing.');
  }
  window.location.assign(url);
}

export async function confirmPayment(authOrToken, orderId) {
  const response = await paymentApi.post(
    '/api/payments/confirm',
    { orderId },
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(authOrToken)
      }
    }
  );

  return unwrap(response);
}

export async function confirmStripePaymentSession(authOrToken, sessionId) {
  const response = await paymentApi.post(
    '/api/payments/stripe/confirm',
    { sessionId },
    {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(authOrToken)
      }
    }
  );

  return unwrap(response);
}

export async function fetchPaymentById(authOrToken, paymentId) {
  const response = await paymentApi.get(`/api/payments/${paymentId}`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function fetchPaymentByOrderId(authOrToken, orderId) {
  const response = await paymentApi.get(`/api/payments/order/${orderId}`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function fetchDoctorEarningsSummary(authOrToken, doctorId) {
  const response = await paymentApi.get(`/api/payments/doctor/${doctorId}/summary`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function downloadPaymentInvoice(authOrToken, paymentId) {
  const response = await paymentApi.get(`/api/payments/${paymentId}/invoice`, {
    headers: authHeaders(authOrToken),
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
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
  const response = await adminApi.patch(`/api/admin/users/doctors/${doctorId}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function deactivateDoctorAccount(token, doctorId) {
  const response = await adminApi.patch(`/api/admin/users/doctors/${doctorId}/deactivate`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    }
  });
  return unwrap(response);
}

export async function updatePatientAccount(token, patientId, payload) {
  const response = await adminApi.patch(`/api/admin/users/patients/${patientId}`, payload, {
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

export async function fetchAdminAppointments(authOrToken, params = {}) {
  const response = await appointmentApi.get('/api/appointments', {
    headers: authHeaders(authOrToken),
    params
  });
  const payload = unwrap(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.appointments)) return payload.appointments;
  return [];
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

export async function fetchTelemedicineSessionById(authOrToken, sessionId) {
  const response = await telemedicineApi.get(`/telemedicine/sessions/${sessionId}`, {
    headers: authHeaders(authOrToken)
  });
  return unwrap(response);
}

export async function createTelemedicineSession(authOrToken, payload) {
  const response = await telemedicineApi.post('/telemedicine/sessions', payload, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function startTelemedicineSession(authOrToken, sessionId) {
  const response = await telemedicineApi.post(`/telemedicine/sessions/${sessionId}/start`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function joinTelemedicineSession(authOrToken, sessionId) {
  const response = await telemedicineApi.post(`/telemedicine/sessions/${sessionId}/join`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function endTelemedicineSession(authOrToken, sessionId) {
  const response = await telemedicineApi.post(`/telemedicine/sessions/${sessionId}/end`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function cancelTelemedicineSession(authOrToken, sessionId) {
  const response = await telemedicineApi.post(`/telemedicine/sessions/${sessionId}/cancel`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(authOrToken)
    }
  });
  return unwrap(response);
}

export async function fetchDoctorPrescriptions(token, doctorId) {
  if (!doctorId) return [];

  const response = await prescriptionApi.get(`/api/prescriptions/doctor/${doctorId}`, {
    headers: authHeaders(token)
  });
  return unwrap(response) || [];
}

export async function fetchPatientPrescriptions(token, patientId) {
  if (!patientId) return [];

  const response = await prescriptionApi.get(`/api/prescriptions/patient/${patientId}`, {
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
    localStorage.removeItem('primehealth:doctorId');
    return;
  }

  const role = auth.user?.role || '';
  const userId = auth.user?.userId || auth.user?.id || auth.user?._id || '';

  localStorage.setItem('primeHealthAuth', JSON.stringify(auth));
  localStorage.setItem('primehealth:token', auth.token || '');
  localStorage.setItem('primehealth:role', role);
  localStorage.setItem('primehealth:userId', userId);
  if (String(role).toLowerCase() === 'doctor') {
    localStorage.setItem('primehealth:doctorId', userId);
  } else {
    localStorage.removeItem('primehealth:doctorId');
  }
}

export function normalizeAuthResponse(response) {
  const token = response?.token || response?.accessToken || response?.data?.token || '';
  const role = response?.role || response?.data?.role || '';
  const user = response?.user || response?.data?.user || response?.profile || null;
  const normalizedUser = user ? { ...user, role: user.role || role } : null;
  return { token, user: normalizedUser };
}
