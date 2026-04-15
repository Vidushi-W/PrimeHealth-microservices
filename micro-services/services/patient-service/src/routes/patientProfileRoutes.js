const express = require("express");

const {
  getHome,
  getProfile,
  updateProfile,
} = require("../controllers/patientProfileController");
const {
  createAppointment,
  getAppointments,
  getDoctors,
  getDoctorSlots,
} = require("../controllers/patientAppointmentController");
const { authorizeRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("patient"));

router.get("/home", getHome);
router.get("/doctors", getDoctors);
router.get("/doctors/:doctorId/slots", getDoctorSlots);
router.get("/appointments", getAppointments);
router.post("/appointments", createAppointment);
router.get("/me", getProfile);
router.put("/me", updateProfile);

module.exports = router;
