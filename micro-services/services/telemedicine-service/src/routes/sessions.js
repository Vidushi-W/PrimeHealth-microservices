const express = require('express');
const mongoose = require('mongoose');
const { auth, requireRole } = require('../middleware/auth');
const ConsultationSession = require('../models/ConsultationSession');
const { canAccessSession, assertTelemedicineVideoAccess } = require('../services/sessionAccess');
const { getRoomName, generateVideoSessionPayload } = require('../services/videoProviders');
const { fetchAppointmentById } = require('../services/appointmentClient');
const env = require('../config/env');

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

const asIsoDateTime = (dateText, timeText) => {
    const day = String(dateText || '').slice(0, 10);
    const hhmm = String(timeText || '').slice(0, 5);
    if (!day || !hhmm) return null;
    const base = new Date(`${day}T${hhmm}:00.000Z`);
    if (!Number.isFinite(base.getTime())) return null;
    return base;
};

const parseUserToAppointmentHeaders = (req) => ({
    Authorization: req.headers.authorization || '',
    'x-user-id': String(req.user?.userId || ''),
    'x-user-role': String(req.user?.role || '').toUpperCase(),
    'x-user-email': String(req.user?.email || ''),
    'x-user-unique-id': String(req.user?.uniqueId || '')
});

const ensureAppointmentAccess = async (req, session) => {
    const appointmentId = String(session?.appointmentId || '').trim();
    if (!appointmentId) {
        return { allowed: true, reason: '', appointment: null };
    }

    const appointment = await fetchAppointmentById(appointmentId, parseUserToAppointmentHeaders(req));
    if (!appointment) {
        return {
            allowed: false,
            reason: 'Appointment not found or inaccessible.',
            code: 'APPOINTMENT_NOT_FOUND'
        };
    }

    const mode = String(appointment.mode || '').toLowerCase();
    if (mode !== 'online') {
        return {
            allowed: false,
            reason: 'Telemedicine is available only for online appointments.',
            code: 'APPOINTMENT_NOT_ONLINE'
        };
    }

    const paymentStatus = String(appointment.paymentStatus || '').toUpperCase();
    const status = String(appointment.status || '').toUpperCase();
    const paidOrConfirmed = paymentStatus === 'PAID' || status === 'CONFIRMED';
    if (!paidOrConfirmed) {
        return {
            allowed: false,
            reason: 'Complete payment before joining telemedicine.',
            code: 'PAYMENT_REQUIRED'
        };
    }

    return {
        allowed: true,
        reason: '',
        appointment,
        code: ''
    };
};

const ensureSessionAccess = async (req, session) => {
    if (canAccessSession(req.user, session)) {
        return { allowed: true, reason: '', code: '' };
    }

    const appointmentAccess = await ensureAppointmentAccess(req, session);
    if (appointmentAccess.allowed) {
        return { allowed: true, reason: '', code: '' };
    }

    return {
        allowed: false,
        reason: appointmentAccess.reason || 'You cannot access this session.',
        code: appointmentAccess.code || 'SESSION_ACCESS_DENIED'
    };
};

/** Doctor or patient (admin treated as doctor for room presence). */
const resolveConferenceRole = (user) => {
    if (user.role === 'doctor' || user.role === 'admin') {
        return 'doctor';
    }

    return 'patient';
};

/**
 * Marks participant presence and opens room.
 * With doctor-host policy, room becomes live only after doctor joins.
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

    if (joinedRole === 'doctor') {
        metadata.doctorHasStarted = true;
    }
    if (joinedRole === 'patient' && session.status === 'scheduled') {
        metadata.patientWaitingSince = metadata.patientWaitingSince || now.toISOString();
    }

    session.metadata = metadata;

    const shouldOpenRoom =
        session.status === 'scheduled'
        && (joinedRole === 'doctor' || !env.doctorHostRequired);

    if (shouldOpenRoom) {
        session.metadata = {
            ...(session.metadata || {}),
            roomOpenedAt: session.metadata?.roomOpenedAt || now.toISOString(),
            roomOpenedBy: session.metadata?.roomOpenedBy || joinedRole
        };
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

        const requestedDoctorId = String(doctorId || '').trim();
        const requestedPatientId = String(patientId || '').trim();

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
        let appointmentSnapshot = null;
        if (trimmedAppointmentId) {
            const appointmentAccess = await ensureAppointmentAccess(req, { appointmentId: trimmedAppointmentId });
            if (!appointmentAccess.allowed) {
                return res.status(403).json({
                    success: false,
                    code: appointmentAccess.code,
                    message: appointmentAccess.reason
                });
            }
            appointmentSnapshot = appointmentAccess.appointment;
        }

        // For direct create (without appointment snapshot), enforce strict self-only role mapping.
        // For appointment-linked create, appointment-service authorization already gates access.
        if (!appointmentSnapshot && req.user.role === 'doctor' && !participantIds.has(requestedDoctorId)) {
            return res.status(403).json({
                success: false,
                message: 'Doctors can only create sessions for themselves.'
            });
        }

        if (!appointmentSnapshot && req.user.role === 'patient' && !participantIds.has(requestedPatientId)) {
            return res.status(403).json({
                success: false,
                message: 'Patients can only create sessions for themselves.'
            });
        }
        if (trimmedAppointmentId) {
            const existingForAppointment = await ConsultationSession.findOne({ appointmentId: trimmedAppointmentId });
            if (existingForAppointment) {
                const sessionAccess = await ensureSessionAccess(req, existingForAppointment);
                if (!sessionAccess.allowed) {
                    return res.status(403).json({
                        success: false,
                        code: sessionAccess.code || 'SESSION_ACCESS_DENIED',
                        message: sessionAccess.reason || 'You cannot access this session.'
                    });
                }
                return res.status(200).json({
                    success: true,
                    data: parseSessionDocument(existingForAppointment)
                });
            }
        }

        const roomName = getRoomName(trimmedAppointmentId);
        const effectiveDoctorId = String(appointmentSnapshot?.doctorId || doctorId).trim();
        const effectivePatientId = String(appointmentSnapshot?.patientId || patientId).trim();
        const appointmentDate = String(appointmentSnapshot?.appointmentDate || '').trim();
        const appointmentStart = String(appointmentSnapshot?.startTime || '').trim();
        const appointmentEnd = String(appointmentSnapshot?.endTime || appointmentStart).trim();
        const scheduleStart = appointmentDate && appointmentStart ? asIsoDateTime(appointmentDate, appointmentStart) : startDate;
        const scheduleEnd = appointmentDate && appointmentEnd ? asIsoDateTime(appointmentDate, appointmentEnd) : endDate;

        const session = await ConsultationSession.create({
            appointmentId: trimmedAppointmentId,
            doctorId: effectiveDoctorId,
            patientId: effectivePatientId,
            scheduledStartAt: scheduleStart,
            scheduledEndAt: scheduleEnd,
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

        const sessions = await ConsultationSession
            .find(filter)
            .sort({ scheduledStartAt: -1 })
            .limit(100);

        if (req.user.role === 'admin') {
            return res.json({
                success: true,
                data: sessions.map(parseSessionDocument)
            });
        }

        const allowedSessions = [];
        for (const session of sessions) {
            const sessionAccess = await ensureSessionAccess(req, session);
            if (sessionAccess.allowed) {
                allowedSessions.push(session);
            }
        }

        return res.json({
            success: true,
            data: allowedSessions.map(parseSessionDocument)
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

        const sessionAccess = await ensureSessionAccess(req, session);
        if (!sessionAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: sessionAccess.code || 'SESSION_ACCESS_DENIED',
                message: sessionAccess.reason || 'You cannot access this session.'
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

router.post('/:sessionId/start', requireRole('doctor', 'admin'), async (req, res) => {
    try {
        const session = await loadSession(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found.'
            });
        }

        const sessionAccess = await ensureSessionAccess(req, session);
        if (!sessionAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: sessionAccess.code || 'SESSION_ACCESS_DENIED',
                message: sessionAccess.reason || 'You cannot access this session.'
            });
        }

        const appointmentAccess = await ensureAppointmentAccess(req, session);
        if (!appointmentAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: appointmentAccess.code || 'APPOINTMENT_NOT_ALLOWED',
                message: appointmentAccess.reason
            });
        }

        if (session.status === 'cancelled' || session.status === 'completed') {
            return res.status(409).json({
                success: false,
                message: `Cannot start a ${session.status} session.`
            });
        }

        const joinAccess = assertTelemedicineVideoAccess(req.user, session, { forVideoToken: false });
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

        const sessionAccess = await ensureSessionAccess(req, session);
        if (!sessionAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: sessionAccess.code || 'SESSION_ACCESS_DENIED',
                message: sessionAccess.reason || 'You cannot access this session.'
            });
        }

        const appointmentAccess = await ensureAppointmentAccess(req, session);
        if (!appointmentAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: appointmentAccess.code || 'APPOINTMENT_NOT_ALLOWED',
                message: appointmentAccess.reason
            });
        }

        const joinAccess = assertTelemedicineVideoAccess(req.user, session, { forVideoToken: false });
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

        const sessionAccess = await ensureSessionAccess(req, session);
        if (!sessionAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: sessionAccess.code || 'SESSION_ACCESS_DENIED',
                message: sessionAccess.reason || 'You cannot access this session.'
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

        const appointmentAccess = await ensureAppointmentAccess(req, session);
        if (!appointmentAccess.allowed) {
            return res.status(403).json({
                success: false,
                code: appointmentAccess.code || 'APPOINTMENT_NOT_ALLOWED',
                message: appointmentAccess.reason
            });
        }

        const joinAccess = assertTelemedicineVideoAccess(req.user, session, { forVideoToken: true });
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
