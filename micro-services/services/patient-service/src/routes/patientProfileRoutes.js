const express = require("express");

const {
  analyzeReport,
  deleteReport,
  getHome,
  getProfile,
  getReports,
  getTimeline,
  uploadReport,
  updateProfile,
  uploadProfilePicture,
} = require("../controllers/patientProfileController");
const { patientPhotoUpload } = require("../middleware/upload");
const {
  createProfile,
  deleteProfile,
  getProfileById,
  listProfiles,
  updateProfile: updateFamilyProfile,
} = require("../controllers/familyProfileController");
const {
  createAppointment,
  getAppointments,
  getDoctors,
  getDoctorSlots,
} = require("../controllers/patientAppointmentController");
const {
  createPatientReminder,
  deletePatientReminder,
  getPatientReminders,
  getUpcomingPatientReminders,
  markPatientReminderDone,
  updatePatientReminder,
} = require("../controllers/reminderController");
const { calculateRisk, getRiskHistory } = require("../controllers/riskAssessmentController");
const { runSymptomCheck } = require("../controllers/symptomCheckerController");
const { authorizeRoles, protect } = require("../middleware/auth");

const router = express.Router();

function runPatientPhotoUpload(req, res, next) {
  patientPhotoUpload.single("profilePicture")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Invalid upload request" });
    }
    next();
  });
}

router.use(protect);
router.use(authorizeRoles("patient"));

router.get("/home", getHome);
router.get("/profiles", listProfiles);
router.post("/profiles", createProfile);
router.get("/profiles/:id", getProfileById);
router.put("/profiles/:id", updateFamilyProfile);
router.delete("/profiles/:id", deleteProfile);
router.get("/timeline", getTimeline);
router.get("/reports", getReports);
router.post("/reports", uploadReport);
router.post("/reports/:reportId/analyze", analyzeReport);
router.delete("/reports/:reportId", deleteReport);
router.post("/symptoms/check", runSymptomCheck);
router.post("/risk-score/calculate", calculateRisk);
router.get("/risk-score/history", getRiskHistory);
router.post("/reminders", createPatientReminder);
router.get("/reminders", getPatientReminders);
router.get("/reminders/upcoming", getUpcomingPatientReminders);
router.put("/reminders/:id", updatePatientReminder);
router.patch("/reminders/:id/mark-done", markPatientReminderDone);
router.delete("/reminders/:id", deletePatientReminder);
router.get("/doctors", getDoctors);
router.get("/doctors/:doctorId/slots", getDoctorSlots);
router.get("/appointments", getAppointments);
router.post("/appointments", createAppointment);
router.get("/me", getProfile);
router.put("/me", updateProfile);
router.post("/me/profile-picture", runPatientPhotoUpload, uploadProfilePicture);

module.exports = router;
