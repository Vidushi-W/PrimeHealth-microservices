const mongoose = require('mongoose');
const { getNextUniqueIdForRole } = require('../utils/uniqueUserId');

const doctorSchema = new mongoose.Schema(
    {
        uniqueId: { type: String, unique: true, sparse: true, trim: true },
        name: { type: String, required: true, trim: true },
        specialty: { type: String, default: '' },
        experience: { type: Number, min: 0 },
        phoneNumber: { type: String, trim: true, default: '' },
        status: { type: String, default: 'pending' },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, default: '' },
        permissions: { type: [String], default: [] },
        documents: [
            {
                type: { type: String, required: true, trim: true },
                url: { type: String, required: true, trim: true },
                status: { type: String, default: 'pending' },
                notes: { type: String, default: '' },
                uploadedAt: { type: Date, default: Date.now },
                verifiedAt: { type: Date, default: null },
                verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
            }
        ],
        lastLoginAt: { type: Date, default: null },
        lastLoginIp: { type: String, default: '' },
        lastLoginUserAgent: { type: String, default: '' },
        lastActiveAt: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

doctorSchema.pre('validate', async function assignDoctorUniqueId(next) {
    try {
        if (this.isNew && !this.uniqueId) {
            this.uniqueId = await getNextUniqueIdForRole('doctor');
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Doctor', doctorSchema);
