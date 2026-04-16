const mongoose = require('mongoose');
const { getNextUniqueIdForRole } = require('../utils/uniqueUserId');

const patientSchema = new mongoose.Schema(
    {
        uniqueId: { type: String, unique: true, sparse: true, trim: true },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, default: '' },
        status: { type: String, default: 'active' },
        permissions: { type: [String], default: [] },
        lastLoginAt: { type: Date, default: null },
        lastLoginIp: { type: String, default: '' },
        lastLoginUserAgent: { type: String, default: '' },
        lastActiveAt: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

patientSchema.pre('validate', async function assignPatientUniqueId(next) {
    try {
        if (this.isNew && !this.uniqueId) {
            this.uniqueId = await getNextUniqueIdForRole('patient');
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Patient', patientSchema);
