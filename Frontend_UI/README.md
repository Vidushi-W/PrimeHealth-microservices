# Frontend UI (React)

This frontend currently targets only the Admin Analytics microservice and is built with React + Vite.

## Features

- Admin login with JWT flow
- Real health and metadata checks
- Analytics summary and appointment trends
- User management actions (status updates and deactivation)
- Doctor verification flow
- Audit logs and finance transactions
- Clear backend-driven error messages with status codes
- Responsive desktop/mobile layout

## Run

1. Start the admin microservice on `http://localhost:5001`.
2. Open a terminal in `Frontend_UI`.
3. Install dependencies:
	- `npm install`
4. Start the app:
	- `npm run dev`
5. Open the Vite URL shown in terminal (typically `http://localhost:5173`).

## Scope

- Included now: Admin + Analytics frontend only.
- Planned later: Telemedicine frontend module.
