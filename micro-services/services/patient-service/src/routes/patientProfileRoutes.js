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
} = require("../controllers/patientProfileController");
const {
  createAppointment,
  getAppointments,
  getDoctors,
  getDoctorSlots,
} = require("../controllers/patientAppointmentController");
const { calculateRisk, getRiskHistory } = require("../controllers/riskAssessmentController");
const { runSymptomCheck } = require("../controllers/symptomCheckerController");
const { authorizeRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("patient"));

router.get("/home", getHome);
router.get("/timeline", getTimeline);
router.get("/reports", getReports);
router.post("/reports", uploadReport);
router.post("/reports/:reportId/analyze", analyzeReport);
router.delete("/reports/:reportId", deleteReport);
router.post("/symptoms/check", runSymptomCheck);
router.post("/risk-score/calculate", calculateRisk);
router.get("/risk-score/history", getRiskHistory);
router.get("/doctors", getDoctors);
router.get("/doctors/:doctorId/slots", getDoctorSlots);
router.get("/appointments", getAppointments);
router.post("/appointments", createAppointment);
router.get("/me", getProfile);
router.put("/me", updateProfile);

module.exports = router;
