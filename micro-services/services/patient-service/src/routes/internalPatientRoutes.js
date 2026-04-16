const express = require("express");
const { getDoctorPatientSummary } = require("../controllers/patientProfileController");

const router = express.Router();

router.get("/patients/:patientId/summary", getDoctorPatientSummary);

module.exports = router;
