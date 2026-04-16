const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actorAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
        actorEmail: { type: String, required: true, trim: true },
        actorRole: { type: String, required: true, trim: true },
        action: { type: String, required: true, trim: true },
        targetType: { type: String, default: '', trim: true },
        targetId: { type: String, default: '', trim: true },
        targetEmail: { type: String, default: '', trim: true },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        ip: { type: String, default: '' },
        userAgent: { type: String, default: '' }
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
