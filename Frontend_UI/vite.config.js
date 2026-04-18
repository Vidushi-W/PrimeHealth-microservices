import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Docker Desktop on Windows publishes these on IPv4; avoid "localhost" in proxy target. */
const targets = {
  admin: 'http://127.0.0.1:5001',
  doctor: 'http://127.0.0.1:5002',
  appointment: 'http://127.0.0.1:5003',
  payment: 'http://127.0.0.1:5004',
  prescription: 'http://127.0.0.1:5005',
  telemedicine: 'http://127.0.0.1:5006',
  patient: 'http://127.0.0.1:5007'
};

const phProxy = (segment) => ({
  target: targets[segment],
  changeOrigin: true,
  secure: false,
  rewrite: (path) => path.replace(new RegExp(`^/__ph/${segment}`), '')
});

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/__ph/admin': phProxy('admin'),
      '/__ph/doctor': phProxy('doctor'),
      '/__ph/appointment': phProxy('appointment'),
      '/__ph/payment': phProxy('payment'),
      '/__ph/prescription': phProxy('prescription'),
      '/__ph/telemedicine': phProxy('telemedicine'),
      '/__ph/patient': phProxy('patient')
    }
  }
});
