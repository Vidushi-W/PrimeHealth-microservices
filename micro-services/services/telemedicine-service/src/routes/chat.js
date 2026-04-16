const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const env = require('../config/env');
const ConsultationSession = require('../models/ConsultationSession');
const ChatMessage = require('../models/ChatMessage');
const { canAccessSession } = require('../services/sessionAccess');
const { isChatWindowOpen } = require('../services/chatWindow');

const router = express.Router();

const parseMessage = (message) => ({
    id: message._id,
    sessionId: message.sessionId,
    senderId: message.senderId,
    senderRole: message.senderRole,
    content: message.content,
    sentAt: message.sentAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
});

const loadSession = async (sessionId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return null;
    }

    return ConsultationSession.findById(sessionId);
};

router.use(auth);

router.get('/:sessionId/messages', async (req, res) => {
    try {
        const session = await loadSession(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found.'
            });
        }

        if (!canAccessSession(req.user, session)) {
            return res.status(403).json({
                success: false,
                message: 'You cannot access this session.'
            });
        }

        const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const messages = await ChatMessage
            .find({ sessionId: session._id })
            .sort({ sentAt: -1 })
            .limit(limit);

        return res.json({
            success: true,
            data: messages.reverse().map(parseMessage)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/messages', async (req, res) => {
    try {
        const session = await loadSession(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found.'
            });
        }

        if (!canAccessSession(req.user, session)) {
            return res.status(403).json({
                success: false,
                message: 'You cannot access this session.'
            });
        }

        if (!isChatWindowOpen(session, new Date(), env.chatPreMinutes, env.chatPostMinutes)) {
            return res.status(403).json({
                success: false,
                message: 'Chat window is closed for this session.'
            });
        }

        const content = String(req.body.content || '').trim();

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'content is required.'
            });
        }

        const message = await ChatMessage.create({
            sessionId: session._id,
            senderId: req.user.userId,
            senderRole: req.user.role,
            content,
            deliveryChannel: 'rest'
        });

        return res.status(201).json({
            success: true,
            data: parseMessage(message)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
