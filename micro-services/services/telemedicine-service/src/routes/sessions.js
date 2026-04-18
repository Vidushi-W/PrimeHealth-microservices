const express = require('express');
const mongoose = require('mongoose');
const { auth, requireRole } = require('../middleware/auth');
const ConsultationSession = require('../models/ConsultationSession');
const { canAccessSession, assertTelemedicineVideoAccess } = require('../services/sessionAccess');
const { getRoomName, generateVideoSessionPayload } = require('../services/videoProviders');

const router = express.Router();

const isValidDate = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime());
};

const parseSessionDocument = (session) => ({
    id: session._id,
    appointmentId: session.appointmentId,
    doctorId: session.doctorId,
    patientId: session.patientId,
    scheduledStartAt: session.scheduledStartAt,
    scheduledEndAt: session.scheduledEndAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: session.status,
    provider: session.provider,
    roomName: session.roomName,
    metadata: session.metadata,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
});

const loadSession = async (sessionId) => {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return null;
    }

    return ConsultationSession.findById(sessionId);
};

/** Doctor or patient (admin treated as doctor for room presence). */
const resolveConferenceRole = (user) => {
    if (user.role === 'doctor' || user.role === 'admin') {
        return 'doctor';
    }

    return 'patient';
};

/**
 * Marks this user as joining the conference, opens the room when still scheduled,
 * and records who first created the Jitsi room (Meet-style: either party can go first).
 */
const recordParticipantJoin = (session, user, via = 'join') => {
    const joinedRole = resolveConferenceRole(user);
    const now = new Date();
    const prevParticipants = (session.metadata || {}).participants || {};
    const metadata = {
        ...(session.metadata || {}),
        participants: {
            ...prevParticipants,
            [joinedRole]: {
                ...(prevParticipants[joinedRole] || {}),
                joinedAt: now.toISOString(),
                userId: user.userId,
                via
            }
        },
        lastJoinedRole: joinedRole,
        lastJoinedAt: now.toISOString()
    };

    if (session.status === 'scheduled') {
        metadata.roomOpenedAt = metadata.roomOpenedAt || now.toISOString();
        metadata.roomOpenedBy = metadata.roomOpenedBy || joinedRole;
    }

    if (joinedRole === 'doctor' && via === 'start') {
        metadata.doctorHasStarted = true;
    }

    session.metadata = metadata;

    if (session.status === 'scheduled') {
        session.status = 'live';
        session.startedAt = session.startedAt || now;
    }
};

router.use(auth);

/** Session creation: doctor, patient (self-only), or admin. */
router.post('/', requireRole('doctor', 'admin', 'patient'), async (req, res) => {
    try {
        const {
            appointmentId = '',
            doctorId,
            patientId,
            scheduledStartAt,
            scheduledEndAt,
            provider,
            metadata = {}
        } = req.body;

        if (!doctorId || !patientId || !scheduledStartAt || !scheduledEndAt) {
            return res.status(400).json({
                success: false,
                message: 'doctorId, patientId, scheduledStartAt, and scheduledEndAt are required.'
            });
        }

        const requesterId = String(req.user.userId || '').trim();
        const requesterUniqueId = String(req.user.uniqueId || '').trim();
        const participantIds = new Set([
            requesterId,
            requesterUniqueId,
            String(req.user.email || '').trim()
        ].filter(Boolean));

        if (req.user.role === 'doctor' && !participantIds.has(String(doctorId).trim())) {
            return res.status(403).json({
                success: false,
                message: 'Doctors can only create sessions for themselves.'
            });
        }

        if (req.user.role === 'patient' && !participantIds.has(String(patientId).trim())) {
            return res.status(403).json({
                success: false,
                message: 'Patients can only create sessions for themselves.'
            });
        }

        if (!isValidDate(scheduledStartAt) || !isValidDate(scheduledEndAt)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedule dates.'
            });
        }

        const startDate = new Date(scheduledStartAt);
        const endDate = new Date(scheduledEndAt);

        if (endDate <= startDate) {
            return res.status(400).json({
                success: false,
                message: 'scheduledEndAt must be later than scheduledStartAt.'
            });
        }

        const trimmedAppointmentId = String(appointmentId || '').trim();
        if (trimmedAppointmentId) {
            const existingForAppointment = await ConsultationSession.findOne({ appointmentId: trimmedAppointmentId });
            if (existingForAppointment) {
                return res.status(200).json({
                    success: true,
                    data: parseSessionDocument(existingForAppointment)
                });
            }
        }

        const roomName = getRoomName(trimmedAppointmentId);

        const session = await ConsultationSession.create({
            appointmentId: trimmedAppointmentId,
            doctorId: String(doctorId).trim(),
            patientId: String(patientId).trim(),
            scheduledStartAt: startDate,
            scheduledEndAt: endDate,
            provider: ['jitsi', 'twilio', 'agora'].includes(String(provider).toLowerCase())
                ? String(provider).toLowerCase()
                : undefined,
            roomName,
            metadata
        });

        return res.status(201).json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (req.user.role === 'doctor') {
            filter.doctorId = req.user.userId;
        }

        if (req.user.role === 'patient') {
            filter.patientId = req.user.userId;
        }

        const sessions = await ConsultationSession
            .find(filter)
            .sort({ scheduledStartAt: -1 })
            .limit(100);

        return res.json({
            success: true,
            data: sessions.map(parseSessionDocument)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:sessionId', async (req, res) => {
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

        return res.json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/start', requireRole('doctor', 'admin', 'patient'), async (req, res) => {
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

        if (session.status === 'cancelled' || session.status === 'completed') {
            return res.status(409).json({
                success: false,
                message: `Cannot start a ${session.status} session.`
            });
        }

        const joinAccess = assertTelemedicineVideoAccess(req.user, session);
        if (!joinAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: joinAccess.code || 'JOIN_NOT_ALLOWED',
                message: joinAccess.reason
            });
        }

        recordParticipantJoin(session, req.user, 'start');
        await session.save();

        return res.json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/join', async (req, res) => {
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

        const joinAccess = assertTelemedicineVideoAccess(req.user, session);
        if (!joinAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: joinAccess.code || 'JOIN_NOT_ALLOWED',
                message: joinAccess.reason
            });
        }

        recordParticipantJoin(session, req.user, 'join');

        await session.save();

        return res.json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/end', async (req, res) => {
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

        if (session.status === 'cancelled' || session.status === 'completed') {
            return res.status(409).json({
                success: false,
                message: `Cannot end a ${session.status} session.`
            });
        }

        session.status = 'completed';
        session.endedAt = new Date();
        await session.save();

        return res.json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/cancel', requireRole('doctor', 'admin'), async (req, res) => {
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

        session.status = 'cancelled';
        session.endedAt = new Date();
        await session.save();

        return res.json({
            success: true,
            data: parseSessionDocument(session)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:sessionId/video-token', async (req, res) => {
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

        const joinAccess = assertTelemedicineVideoAccess(req.user, session);
        if (!joinAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: joinAccess.code || 'JOIN_NOT_ALLOWED',
                message: joinAccess.reason
            });
        }

        const payload = generateVideoSessionPayload(session, req.user);

        return res.json({
            success: true,
            data: payload
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
