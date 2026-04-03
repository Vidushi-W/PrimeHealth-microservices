const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// @route   POST /api/patients/register
// @desc    Register a new patient
// @access  Public
router.post('/register', patientController.registerPatient);

module.exports = router;
