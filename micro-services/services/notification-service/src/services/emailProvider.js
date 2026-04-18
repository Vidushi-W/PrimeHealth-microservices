const nodemailer = require('nodemailer');

function createEmailProvider() {
  const enabled = String(process.env.EMAIL_ENABLED || '').toLowerCase() === 'true';
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT || 587);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;

  if (!enabled || !host || !user || !pass || !fromAddress) {
    return {
      enabled: false,
      async send() {
        return { sent: false, provider: 'smtp', reason: 'Email provider not configured' };
      }
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return {
    enabled: true,
    async send({ to, subject, text }) {
      const destination = String(to || '').trim();
      if (!destination) {
        return { sent: false, provider: 'smtp', reason: 'Missing destination email address' };
      }

      await transporter.sendMail({
        from: fromAddress,
        to: destination,
        subject,
        text
      });

      return { sent: true, provider: 'smtp' };
    }
  };
}

module.exports = { createEmailProvider };
