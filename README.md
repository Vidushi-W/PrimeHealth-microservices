# PrimeHealth AI Microservices Platform

## Platform Roles

### Admin Role
- Manage user accounts
- Verify doctor registrations
- Oversee platform operations
- Monitor financial transactions

## Platform Frontend (React)

Main website (asynchronous web client) location:
- `frontend/admin-analytics-client`

Current architecture:
- Route-based platform shell for future expansion
- `Home` route with service module navigation
- `Admin Analytics` implemented as an active module
- `Telemedicine`, `Appointments`, `AI Symptom Checker`, `Payments` and other routes scaffolded as module placeholders

Run locally (from repository root):
1. Start backend (`admin-analytics-service`) on `http://localhost:5001`
2. Run `npm run dev`
3. Open the local URL shown by Vite (usually `http://localhost:5173`)

Alternative run (from `frontend`):
- `npm run dev`

Environment variable:
- `VITE_API_BASE_URL` (default: `http://localhost:5001`)

Production build:
- `npm run build`
