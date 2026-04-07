const mongoose = require('mongoose');

const ConsultationSessionSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: String,
            index: true,
            trim: true,
            default: ''
        },
        doctorId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        patientId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        scheduledStartAt: {
            type: Date,
            required: true,
            index: true
        },
        scheduledEndAt: {
            type: Date,
            required: true
        },
        startedAt: {
            type: Date,
            default: null
        },
        endedAt: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['scheduled', 'live', 'completed', 'cancelled'],
            default: 'scheduled',
            index: true
        },
        provider: {
            type: String,
            enum: ['jitsi', 'twilio', 'agora'],
            default: 'jitsi'
        },
        roomName: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

ConsultationSessionSchema.index({ doctorId: 1, scheduledStartAt: -1 });
ConsultationSessionSchema.index({ patientId: 1, scheduledStartAt: -1 });

module.exports = mongoose.model('ConsultationSession', ConsultationSessionSchema);
