const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
    {
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

module.exports = mongoose.model('Admin', adminSchema);
