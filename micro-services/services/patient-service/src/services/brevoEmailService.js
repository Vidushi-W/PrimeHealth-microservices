const User = require("../models/User");
const Reminder = require("../models/Reminder");

const BREVO_BASE_URL = "https://api.brevo.com/v3/smtp/email";

function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

function buildReminderEmailHtml(user, reminder) {
  const reminderLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(reminder.dateTime));

  const detailLines = reminder.type === "medication"
    ? [
      reminder.medicineName ? `Medicine: ${reminder.medicineName}` : "",
      reminder.dosage ? `Dosage: ${reminder.dosage}` : "",
      reminder.frequency ? `Frequency: ${reminder.frequency}` : "",
    ]
    : [
      reminder.doctorName ? `Doctor: ${reminder.doctorName}` : "",
      reminder.hospitalName ? `Hospital: ${reminder.hospitalName}` : "",
    ];

  return [
    `<h2>Reminder: ${reminder.title}</h2>`,
    `<p>Hello ${user.fullName || "Patient"},</p>`,
    `<p>This is your PrimeHealth reminder for <strong>${reminderLabel}</strong>.</p>`,
    reminder.description ? `<p>${reminder.description}</p>` : "",
    detailLines.filter(Boolean).map((line) => `<p>${line}</p>`).join(""),
    `<p>Repeat: ${reminder.repeat}</p>`,
    `<p>This is an automated reminder from PrimeHealth.</p>`,
  ].join("");
}

async function sendReminderEmail(reminder, user) {
  console.log("Sending reminder email to:", user.email, "for reminder:", reminder.title);

  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME || "PrimeHealth",
    },
    to: [
      {
        email: user.email,
        name: user.fullName || "Patient",
      },
    ],
    subject: `PrimeHealth reminder: ${reminder.title}`,
    htmlContent: buildReminderEmailHtml(user, reminder),
  };

  const response = await fetch(BREVO_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email send failed: ${response.status} ${errorBody}`);
  }
}

function getNextDateTime(currentDate, repeat) {
  const base = new Date(currentDate);
  if (repeat === "daily") {
    base.setDate(base.getDate() + 1);
    return base;
  }

  if (repeat === "weekly") {
    base.setDate(base.getDate() + 7);
    return base;
  }

  return base;
}

async function processDueReminderEmails() {
  if (!isBrevoConfigured()) {
    console.log("Reminder email check skipped because Brevo is not configured.");
    return;
  }

  const now = new Date();
  console.log("Checking reminders at:", now.toISOString());
  const dueReminders = await Reminder.find({
    status: "upcoming",
    "notification.emailEnabled": true,
    dateTime: { $lte: now },
    $or: [
      { "notification.lastEmailSentAt": null },
      { "notification.lastEmailSentAt": { $lt: new Date(now.getTime() - (15 * 60 * 1000)) } },
    ],
  }).limit(25);

  console.log("Due reminders found:", dueReminders.length);

  for (const reminder of dueReminders) {
    const user = await User.findById(reminder.patientId).select("fullName email");
    if (!user?.email) {
      console.log("Skipping reminder because patient email is missing:", reminder._id);
      reminder.notification.lastEmailError = "Patient email not found";
      await reminder.save();
      continue;
    }

    try {
      await sendReminderEmail(reminder, user);
      console.log("Reminder email sent successfully for reminder:", reminder._id.toString());
      reminder.notification.lastEmailSentAt = new Date();
      reminder.notification.lastEmailError = "";

      if (reminder.repeat === "once") {
        reminder.status = "missed";
      } else {
        reminder.dateTime = getNextDateTime(reminder.dateTime, reminder.repeat);
      }

      await reminder.save();
    } catch (error) {
      console.error("Reminder email send failed for reminder:", reminder._id.toString(), error.message);
      reminder.notification.lastEmailError = error.message;
      await reminder.save();
    }
  }
}

module.exports = {
  isBrevoConfigured,
  processDueReminderEmails,
};
