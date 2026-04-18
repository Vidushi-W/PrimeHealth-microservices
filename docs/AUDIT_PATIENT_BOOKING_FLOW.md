# Audit: Patient booking, payment, and appointment visibility

## Booking path (patient)

1. **Frontend** calls `POST /api/patients/appointments` with `doctorId`, `appointmentDate`, `timeSlot`, `mode`, `reason` ([`Frontend_UI/src/services/patientApi.js`](Frontend_UI/src/services/patientApi.js)).
2. **Patient-service** [`appointmentBookingService.createAppointmentBooking`](micro-services/services/patient-service/src/services/appointmentBookingService.js):
   - Validates slot via `listDoctorSlots` (doctor directory + reserved slots in `PatientAppointment`).
   - Creates **local** `PatientAppointment` with `status: pending_payment`, `paymentStatus: pending`.
   - Calls **appointment-service** `createCentralAppointment` with `startTime` / `endTime` from selected slot, `patientId`, `doctorId` (resolved to central doctor id), etc.
   - Central appointment is created with `status: PENDING`, `paymentStatus: UNPAID` (appointment-service model).

## Slots path

- **Frontend** calls `GET /api/patients/doctors/:doctorId/slots?date=YYYY-MM-DD&mode=online|physical` ([`patientApi.getDoctorSlots`](Frontend_UI/src/services/patientApi.js)).
- **Patient-service** resolves doctor from doctor-service (or local profile), expands availability into bookable slots, marks disabled if already reserved.

## Payment → visibility

- **Payment service** completes PayHere flow and calls appointment-service `PATCH /api/appointments/:id/payment-status` with `paymentStatus: PAID`.
- **Appointment-service** [`updatePaymentStatus`](micro-services/services/appointment-service/src/services/appointmentService.js) sets `paymentStatus` and, when `PAID` and status was `PENDING`, sets `status: CONFIRMED`.

## Patient appointment lists (frontend)

- [`AppointmentHubPage`](Frontend_UI/src/pages/AppointmentHubPage.jsx) merges:
  - **Central**: `GET /api/appointments/my` (appointment-service)
  - **Portal**: `GET /api/patients/appointments` (patient-service mirror)
- Normalization maps `paymentStatus` to uppercase; portal may show `pending` until sync.

## Doctor appointment list (frontend)

- [`DoctorAppointmentsPage`](Frontend_UI/src/pages/DoctorAppointmentsPage.jsx) uses `GET /api/appointments` with `status` query; appointment-service supports `paymentStatus` query ([`appointmentController.getAllAppointments`](micro-services/services/appointment-service/src/controllers/appointmentController.js)).

## Telemedicine (prior state)

- Session `POST /telemedicine/sessions` was restricted to doctor/admin; join/video-token used `assertTelemedicineVideoAccess` to block patients until doctor presence. Plan updates relax this so either party can start/join within the scheduled window + grace.
