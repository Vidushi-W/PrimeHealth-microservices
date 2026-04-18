# Backend routes vs frontend usage (high-signal)

This is a manual audit comparing route modules under `micro-services/services/*` with API calls in `Frontend_UI/src/services` (`platformApi.js`, `patientApi.js`, `doctorService.js`). Use it to decide what to surface next in Patient/Doctor UIs.

## Appointment service

| Route | Used in frontend | Suggested UI |
|-------|------------------|--------------|
| `GET /api/appointments/doctor/:doctorId/slots` | Not referenced in `patientApi` / `platformApi` (booking uses patient-service slots) | Optional: use as single slot source on Find-a-Doctor; would require auth alignment. |
| `POST /api/appointments` via `platformApi.createAppointment` | Exported but primary patient flow uses `POST /api/patients/appointments` | Keep for admin/doctor tooling or deprecate in UI if redundant. |
| `DELETE /api/appointments/:id` (admin) | Not in frontend services | Admin console only (unchanged per product scope). |

## Doctor service

| Route | Used in frontend | Suggested UI |
|-------|------------------|--------------|
| `GET /api/doctors/:id/upcoming-appointments` | `doctorService.fetchDoctorUpcomingAppointments` | Doctor dashboard “Next visits” widget (not all pages use it). |
| `GET /api/doctors/:id/next-available-slot` | Not in `doctorService.js` | Patient cards “next slot” could use this instead of client-side guess. |
| `GET /api/doctors/:id/availability` | Not directly in frontend services | Expose read-only availability preview on patient doctor profile. |

## Patient service

| Route area | Notes |
|------------|--------|
| Reminders CRUD | Implemented in `patientApi.js`; ensure Reminders / dashboard widgets use all of `upcoming`, `mark-done`, etc. |
| Internal sync routes (`/api/internal/...`) | Service-to-service only — no UI. |

## Payment service

| Route | Used in frontend | Suggested UI |
|-------|------------------|--------------|
| `GET /api/payments` (list) | `platformApi` | Admin/finance style views; patient hub uses `my` + order lookup. |
| `GET /api/payments/doctor/:doctorId/summary` | Present in `platformApi` | Doctor earnings could cross-check with earnings service. |

## Telemedicine service

| Route | Notes |
|-------|--------|
| `POST /telemedicine/sessions/:id/start` | Confirm doctor/patient flows in `TelemedicinePage` still need explicit “start” vs implicit join. |

## How to extend this list

Run a search for `router.(get|post|patch|delete)` in each service `src/routes` folder, then search the frontend `src/services` directory for the path string. Any route with no hits is a candidate for integration or intentional internal-only use.
