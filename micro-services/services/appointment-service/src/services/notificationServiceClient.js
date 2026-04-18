const axios = require('axios');

const NOTIFICATION_BASE_URL = (process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008').replace(/\/+$/, '');

const client = axios.create({
  baseURL: NOTIFICATION_BASE_URL,
  timeout: 5000
});

function fireAndForget(promise) {
  promise.catch((error) => {
    // Keep appointment flow resilient even if notification service is down.
    // eslint-disable-next-line no-console
    console.warn('[notification-service] request failed:', error.message);
  });
}

function notifyAppointmentBooked(payload) {
  fireAndForget(client.post('/api/notifications/events/appointment-booked', payload));
}

function notifyConsultationCompleted(payload) {
  fireAndForget(client.post('/api/notifications/events/consultation-completed', payload));
}

module.exports = {
  notifyAppointmentBooked,
  notifyConsultationCompleted
};
