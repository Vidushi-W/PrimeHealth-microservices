const mongoose = require('mongoose');
const { getNextUniqueIdForRole } = require('../utils/uniqueUserId');

const adminSchema = new mongoose.Schema(
    {
        uniqueId: { type: String, unique: true, sparse: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, default: 'admin' },
        permissions: { type: [String], default: [] },
        status: { type: String, default: 'active' },
        lastLoginAt: { type: Date, default: null },
        lastLoginIp: { type: String, default: '' },
        lastLoginUserAgent: { type: String, default: '' },
        lastActiveAt: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

adminSchema.pre('validate', async function assignAdminUniqueId(next) {
    try {
        if (this.isNew && !this.uniqueId) {
            this.uniqueId = await getNextUniqueIdForRole('admin');
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Admin', adminSchema);
