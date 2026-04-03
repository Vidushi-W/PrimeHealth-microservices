const Patient = require('../models/Patient');

// In a real application, you would install and use bcryptjs or bcrypt
// For right now, we will simulate hashing for demonstration purposes if bcrypt is unavailable.
// Uncomment the line below once `npm install bcryptjs` is run:
// const bcrypt = require('bcryptjs');

exports.registerPatient = async (req, res) => {
  try {
    const {
      email, password, fullName, dob, gender, contactNumber,
      bloodGroup, knownAllergies, chronicConditions,
      registerFor, relationship
    } = req.body;

    // Basic Backend Validation
    if (!email || !password || !fullName || !dob || !gender || !contactNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ error: "A patient with this email already exists." });
    }

    // Hash Password
    // const salt = await bcrypt.genSalt(10);
    // const passwordHash = await bcrypt.hash(password, salt);
    const passwordHash = password; // WARNING: Dummy hash for scaffolding

    // Handle Multi-Profile Setup
    const isFamilyMember = registerFor === 'family';

    // Parse array string inputs (e.g. "Peanuts, Dust" -> ["Peanuts", "Dust"])
    const parseList = (str) => typeof str === 'string' && str ? str.split(',').map(s => s.trim()) : [];

    const newPatient = new Patient({
      email,
      passwordHash,
      fullName,
      dob,
      gender,
      contactNumber,
      bloodGroup,
      knownAllergies: parseList(knownAllergies),
      chronicConditions: parseList(chronicConditions),
      isFamilyMember,
      relationshipToPrimary: isFamilyMember ? relationship : ''
    });

    const savedPatient = await newPatient.save();

    res.status(201).json({
      message: "Patient registered successfully",
      patientId: savedPatient._id
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Server Error during registration" });
  }
};
