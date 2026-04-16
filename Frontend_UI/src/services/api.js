import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_DOCTOR_API_URL || 'http://localhost:5002',
  timeout: 10000
});

function readStoredJson(key) {
  try {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

function readStoredValue(keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) return value;
  }

  return '';
}

api.interceptors.request.use((config) => {
  const storedUser =
    readStoredJson('primehealth:user') ||
    readStoredJson('primehealthUser') ||
    readStoredJson('user') ||
    {};

  const userId =
    readStoredValue(['primehealth:userId', 'primehealthDoctorId', 'doctorId', 'userId']) ||
    storedUser.id ||
    storedUser._id ||
    storedUser.doctorId ||
    '';
  const role = readStoredValue(['primehealth:role', 'userRole', 'role']) || storedUser.role || 'doctor';
  const token = readStoredValue(['primehealth:token', 'accessToken', 'token']);

  if (userId) config.headers['x-user-id'] = userId;
  if (role) config.headers['x-user-role'] = role;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.details?.[0]?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject(new Error(message));
  }
);

export default api;
