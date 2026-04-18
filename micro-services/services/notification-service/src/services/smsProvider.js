const twilio = require('twilio');

function normalizePhone(value) {
  return String(value || '').trim();
}

function createSmsProvider() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const enabled = String(process.env.SMS_ENABLED || '').toLowerCase() === 'true';

  if (!enabled || !sid || !token || !fromNumber) {
    return {
      enabled: false,
      async send() {
        return { sent: false, provider: 'twilio', reason: 'SMS provider not configured' };
      }
    };
  }

  const client = twilio(sid, token);
  return {
    enabled: true,
    async send({ to, body }) {
      const destination = normalizePhone(to);
      if (!destination) {
        return { sent: false, provider: 'twilio', reason: 'Missing destination phone number' };
      }

      await client.messages.create({
        from: fromNumber,
        to: destination,
        body
      });

      return { sent: true, provider: 'twilio' };
    }
  };
}

module.exports = { createSmsProvider };
