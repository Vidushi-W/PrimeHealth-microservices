const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ConsultationSession',
            required: true,
            index: true
        },
        senderId: {
            type: String,
            required: true,
            trim: true
        },
        senderRole: {
            type: String,
            enum: ['patient', 'doctor', 'admin'],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        sentAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        deliveryChannel: {
            type: String,
            enum: ['rest', 'socket'],
            default: 'rest'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

ChatMessageSchema.index({ sessionId: 1, sentAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
