const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        status: { type: String, default: 'active' },
        permissions: { type: [String], default: [] },
        lastActiveAt: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
