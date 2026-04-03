const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  // Basic Details
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'],
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },

  // Clinical Data
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown / Prefer not to say', ''],
    default: '',
  },
  knownAllergies: {
    type: [String],
    default: [],
  },
  chronicConditions: {
    type: [String],
    default: [],
  },

  // Multi-Profile Support
  isFamilyMember: {
    type: Boolean,
    default: false,
  },
  primaryAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null, // Null means this is the primary account
  },
  relationshipToPrimary: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);
