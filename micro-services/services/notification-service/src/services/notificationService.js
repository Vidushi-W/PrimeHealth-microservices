const { createSmsProvider } = require('./smsProvider');
const { createEmailProvider } = require('./emailProvider');

const smsProvider = createSmsProvider();
const emailProvider = createEmailProvider();

function buildAppointmentBookedMessage(payload) {
  const doctorName = payload.doctorName || 'Doctor';
  const patientName = payload.patientName || 'Patient';
  const date = payload.appointmentDate || 'TBD';
  const time = payload.startTime || payload.time || 'TBD';

  return {
    subject: 'Appointment Confirmation - PrimeHealth',
    patientText: `Hi ${patientName}, your appointment with ${doctorName} is booked for ${date} at ${time}.`,
    doctorText: `Hi ${doctorName}, you have a new appointment with ${patientName} on ${date} at ${time}.`,
    patientSms: `PrimeHealth: Appointment booked with ${doctorName} on ${date} at ${time}.`,
    doctorSms: `PrimeHealth: New booking with ${patientName} on ${date} at ${time}.`
  };
}

function buildConsultationCompletedMessage(payload) {
  const doctorName = payload.doctorName || 'Doctor';
  const patientName = payload.patientName || 'Patient';
  const date = payload.completedAt || payload.appointmentDate || 'today';

  return {
    subject: 'Consultation Completed - PrimeHealth',
    patientText: `Hi ${patientName}, your consultation with ${doctorName} has been marked as completed (${date}).`,
    doctorText: `Hi ${doctorName}, consultation with ${patientName} has been marked as completed (${date}).`,
    patientSms: `PrimeHealth: Your consultation with ${doctorName} is completed.`,
    doctorSms: `PrimeHealth: Consultation with ${patientName} is completed.`
  };
}

async function sendToRecipient(recipient, emailContent, smsContent) {
  const results = [];

  if (recipient.email) {
    results.push(
      emailProvider.send({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text
      })
    );
  }

  if (recipient.phone) {
    results.push(
      smsProvider.send({
        to: recipient.phone,
        body: smsContent
      })
    );
  }

  if (!results.length) {
    return [{ sent: false, reason: 'No contact channels (email/phone) provided' }];
  }

  return Promise.all(results);
}

async function notifyAppointmentBooked(payload) {
  const message = buildAppointmentBookedMessage(payload);
  const patientRecipient = payload.patient || {};
  const doctorRecipient = payload.doctor || {};

  const [patientResults, doctorResults] = await Promise.all([
    sendToRecipient(patientRecipient, { subject: message.subject, text: message.patientText }, message.patientSms),
    sendToRecipient(doctorRecipient, { subject: message.subject, text: message.doctorText }, message.doctorSms)
  ]);

  return {
    event: 'appointment-booked',
    channels: {
      patient: patientResults,
      doctor: doctorResults
    }
  };
}

async function notifyConsultationCompleted(payload) {
  const message = buildConsultationCompletedMessage(payload);
  const patientRecipient = payload.patient || {};
  const doctorRecipient = payload.doctor || {};

  const [patientResults, doctorResults] = await Promise.all([
    sendToRecipient(patientRecipient, { subject: message.subject, text: message.patientText }, message.patientSms),
    sendToRecipient(doctorRecipient, { subject: message.subject, text: message.doctorText }, message.doctorSms)
  ]);

  return {
    event: 'consultation-completed',
    channels: {
      patient: patientResults,
      doctor: doctorResults
    }
  };
}

module.exports = {
  notifyAppointmentBooked,
  notifyConsultationCompleted
};
