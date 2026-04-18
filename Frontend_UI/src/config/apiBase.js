/**
 * API bases for the PrimeHealth SPA.
 *
 * **Development (`npm run dev`):** defaults use the Vite dev-server proxy (`/__ph/...`) so
 * requests are same-origin (no CORS) and avoid Windows browsers using IPv6 `localhost`
 * while Docker publishes APIs on IPv4 — a common cause of Axios "Network Error".
 *
 * **Production:** defaults use `VITE_API_HOST` or `127.0.0.1` with the usual ports.
 *
 * Override any service with `VITE_*_API_URL`. Disable the dev proxy with
 * `VITE_DEV_PROXY=false` (then set explicit URLs or rely on `VITE_API_HOST`).
 */
const host = (import.meta.env.VITE_API_HOST || '127.0.0.1').replace(/\/+$/, '');

const dev = import.meta.env.DEV;
const useDevProxy =
  dev &&
  import.meta.env.VITE_DEV_PROXY !== '0' &&
  String(import.meta.env.VITE_DEV_PROXY || '').toLowerCase() !== 'false';

const P = '/__ph';

function devOrDirect(segment, port) {
  if (useDevProxy) return `${P}/${segment}`;
  return `http://${host}:${port}`;
}

export const API_BASE_PATIENT =
  import.meta.env.VITE_PATIENT_API_URL || devOrDirect('patient', 5007);
export const API_BASE_DOCTOR =
  import.meta.env.VITE_DOCTOR_API_URL || devOrDirect('doctor', 5002);
export const API_BASE_APPOINTMENT =
  import.meta.env.VITE_APPOINTMENT_API_URL || devOrDirect('appointment', 5003);
export const API_BASE_PAYMENT =
  import.meta.env.VITE_PAYMENT_API_URL || devOrDirect('payment', 5004);
export const API_BASE_ADMIN =
  import.meta.env.VITE_ADMIN_API_URL || devOrDirect('admin', 5001);
export const API_BASE_PRESCRIPTION =
  import.meta.env.VITE_PRESCRIPTION_API_URL || devOrDirect('prescription', 5005);
export const API_BASE_TELEMEDICINE =
  import.meta.env.VITE_TELEMEDICINE_API_URL || devOrDirect('telemedicine', 5006);
