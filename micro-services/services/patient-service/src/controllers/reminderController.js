const {
  createReminder,
  deleteReminder,
  listReminders,
  listUpcomingReminders,
  markReminderDone,
  updateReminder,
} = require("../services/reminderService");

async function createPatientReminder(req, res) {
  try {
    const result = await createReminder(req.user._id, req.body, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create reminder",
      error: error.message,
    });
  }
}

async function getPatientReminders(req, res) {
  try {
    const result = await listReminders(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch reminders",
      error: error.message,
    });
  }
}

async function getUpcomingPatientReminders(req, res) {
  try {
    const result = await listUpcomingReminders(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch upcoming reminders",
      error: error.message,
    });
  }
}

async function updatePatientReminder(req, res) {
  try {
    const result = await updateReminder(req.user._id, req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update reminder",
      error: error.message,
    });
  }
}

async function markPatientReminderDone(req, res) {
  try {
    const result = await markReminderDone(req.user._id, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to mark reminder as done",
      error: error.message,
    });
  }
}

async function deletePatientReminder(req, res) {
  try {
    const result = await deleteReminder(req.user._id, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete reminder",
      error: error.message,
    });
  }
}

module.exports = {
  createPatientReminder,
  deletePatientReminder,
  getPatientReminders,
  getUpcomingPatientReminders,
  markPatientReminderDone,
  updatePatientReminder,
};
