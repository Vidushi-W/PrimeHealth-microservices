import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5002',
  timeout: 10000
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
