const Reminder = require("../models/Reminder");
const { getAccessibleProfile } = require("./familyProfileService");

function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function splitDateTime(value) {
  const date = new Date(value);
  const iso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

function formatDateTimeLabel(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildReminderResponse(reminder) {
  const dateParts = splitDateTime(reminder.dateTime);

  return {
    id: reminder._id,
    patientId: reminder.patientId,
    profileId: reminder.profileId,
    type: reminder.type,
    title: reminder.title,
    description: reminder.description || "",
    dateTime: reminder.dateTime,
    dateTimeLabel: formatDateTimeLabel(reminder.dateTime),
    date: dateParts.date,
    time: dateParts.time,
    repeat: reminder.repeat,
    status: reminder.status,
    medicineName: reminder.medicineName || "",
    dosage: reminder.dosage || "",
    frequency: reminder.frequency || "",
    doctorName: reminder.doctorName || "",
    hospitalName: reminder.hospitalName || "",
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  };
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function syncMissedStatuses(patientId) {
  await Reminder.updateMany(
    {
      patientId,
      status: "upcoming",
      dateTime: { $lt: new Date() },
      repeat: "once",
      $or: [
        { "notification.emailEnabled": false },
        { "notification.lastEmailSentAt": { $ne: null } },
      ],
    },
    { $set: { status: "missed" } }
  );
}

function validatePayload(payload, { partial = false } = {}) {
  const required = partial ? [] : ["type", "title", "date", "time", "repeat"];
  const missing = required.filter((field) => !String(payload[field] || "").trim());

  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (payload.type !== undefined && !["medication", "appointment"].includes(String(payload.type))) {
    return "Reminder type must be medication or appointment";
  }

  if (payload.repeat !== undefined && !["once", "daily", "weekly"].includes(String(payload.repeat))) {
    return "Repeat must be once, daily, or weekly";
  }

  if (payload.status !== undefined && !["upcoming", "done", "missed"].includes(String(payload.status))) {
    return "Status must be upcoming, done, or missed";
  }

  if (payload.date !== undefined && payload.time !== undefined) {
    const candidate = toDateTime(payload.date, payload.time);
    if (Number.isNaN(candidate.getTime())) {
      return "Date and time are invalid";
    }
  }

  return "";
}

async function createReminder(patientId, payload, profileId) {
  const validationError = validatePayload(payload);
  if (validationError) {
    return {
      status: 400,
      body: { message: validationError },
    };
  }

  const profile = await getAccessibleProfile(patientId, profileId);
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const reminder = await Reminder.create({
    patientId,
    profileId: profile._id,
    type: payload.type,
    title: payload.title,
    description: payload.description || "",
    dateTime: toDateTime(payload.date, payload.time),
    repeat: payload.repeat,
    status: payload.status || "upcoming",
    medicineName: payload.type === "medication" ? payload.medicineName || "" : "",
    dosage: payload.type === "medication" ? payload.dosage || "" : "",
    frequency: payload.type === "medication" ? payload.frequency || "" : "",
    doctorName: payload.type === "appointment" ? payload.doctorName || "" : "",
    hospitalName: payload.type === "appointment" ? payload.hospitalName || "" : "",
  });

  return {
    status: 201,
    body: {
      success: true,
      message: "Reminder created successfully",
      reminder: buildReminderResponse(reminder),
    },
  };
}

async function listReminders(patientId, profileId) {
  await syncMissedStatuses(patientId);

  const query = { patientId };
  if (profileId) {
    query.profileId = profileId;
  }

  const reminders = await Reminder.find(query).sort({ dateTime: 1, createdAt: -1 });
  const all = reminders.map(buildReminderResponse);
  const { start, end } = getTodayBounds();

  return {
    status: 200,
    body: {
      success: true,
      reminders: all,
      upcoming: all.filter((item) => item.status === "upcoming" && new Date(item.dateTime) > end),
      today: all.filter((item) => item.status === "upcoming" && new Date(item.dateTime) >= start && new Date(item.dateTime) <= end),
      completed: all.filter((item) => item.status === "done"),
    },
  };
}

async function listUpcomingReminders(patientId, profileId) {
  await syncMissedStatuses(patientId);

  const query = {
    patientId,
    status: "upcoming",
    dateTime: { $gte: new Date() },
  };
  if (profileId) {
    query.profileId = profileId;
  }

  const reminders = await Reminder.find(query).sort({ dateTime: 1 });

  return {
    status: 200,
    body: {
      success: true,
      reminders: reminders.map(buildReminderResponse),
    },
  };
}

async function updateReminder(patientId, reminderId, payload) {
  const validationError = validatePayload(payload, { partial: true });
  if (validationError) {
    return {
      status: 400,
      body: { message: validationError },
    };
  }

  const reminder = await Reminder.findOne({ _id: reminderId, patientId });
  if (!reminder) {
    return {
      status: 404,
      body: { message: "Reminder not found" },
    };
  }

  if (payload.type !== undefined) {
    reminder.type = payload.type;
  }
  if (payload.title !== undefined) {
    reminder.title = payload.title;
  }
  if (payload.description !== undefined) {
    reminder.description = payload.description;
  }
  if (payload.repeat !== undefined) {
    reminder.repeat = payload.repeat;
  }
  if (payload.status !== undefined) {
    reminder.status = payload.status;
  }
  if (payload.date !== undefined && payload.time !== undefined) {
    reminder.dateTime = toDateTime(payload.date, payload.time);
  }

  const currentType = payload.type || reminder.type;
  reminder.medicineName = currentType === "medication" ? (payload.medicineName !== undefined ? payload.medicineName : reminder.medicineName) : "";
  reminder.dosage = currentType === "medication" ? (payload.dosage !== undefined ? payload.dosage : reminder.dosage) : "";
  reminder.frequency = currentType === "medication" ? (payload.frequency !== undefined ? payload.frequency : reminder.frequency) : "";
  reminder.doctorName = currentType === "appointment" ? (payload.doctorName !== undefined ? payload.doctorName : reminder.doctorName) : "";
  reminder.hospitalName = currentType === "appointment" ? (payload.hospitalName !== undefined ? payload.hospitalName : reminder.hospitalName) : "";

  await reminder.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Reminder updated successfully",
      reminder: buildReminderResponse(reminder),
    },
  };
}

async function markReminderDone(patientId, reminderId) {
  const reminder = await Reminder.findOne({ _id: reminderId, patientId });
  if (!reminder) {
    return {
      status: 404,
      body: { message: "Reminder not found" },
    };
  }

  reminder.status = "done";
  await reminder.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Reminder marked as done",
      reminder: buildReminderResponse(reminder),
    },
  };
}

async function deleteReminder(patientId, reminderId) {
  const reminder = await Reminder.findOneAndDelete({ _id: reminderId, patientId });
  if (!reminder) {
    return {
      status: 404,
      body: { message: "Reminder not found" },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Reminder deleted successfully",
    },
  };
}

module.exports = {
  createReminder,
  deleteReminder,
  listReminders,
  listUpcomingReminders,
  markReminderDone,
  updateReminder,
};
