# notification-service

Notification microservice for PrimeHealth.

Sends SMS and email confirmations for:
- successful appointment booking
- consultation completion

## Scripts

- `npm run dev` - Start with nodemon
- `npm start` - Start service

## Default Port

- `5008`

## Environment Variables

### SMS (Twilio)
- `SMS_ENABLED=true|false`
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_PHONE_NUMBER=+1...`

### Email (SMTP)
- `EMAIL_ENABLED=true|false`
- `EMAIL_SMTP_HOST=smtp.example.com`
- `EMAIL_SMTP_PORT=587`
- `EMAIL_SMTP_USER=...`
- `EMAIL_SMTP_PASS=...`
- `EMAIL_FROM_ADDRESS=no-reply@primehealth.app`

## Endpoints

- `GET /health` - Health check
- `POST /api/notifications/events/appointment-booked`
- `POST /api/notifications/events/consultation-completed`

## Example payload

```json
{
  "appointmentId": "abc123",
  "appointmentDate": "2026-04-18",
  "startTime": "10:30",
  "doctorName": "Dr. Perera",
  "patientName": "Nimal",
  "doctor": { "email": "doctor@primehealth.app", "phone": "+9477..." },
  "patient": { "email": "patient@mail.com", "phone": "+9471..." }
}
```
