const env = require('../config/env');

const normalize = (value) => String(value || '').trim();

const userIdentifiers = (user) => {
    const values = [
        normalize(user?.userId),
        normalize(user?.uniqueId),
        normalize(user?.email)
    ].filter(Boolean);

    return new Set(values);
};

const canAccessSession = (user, session) => {
    if (user.role === 'admin') {
        return true;
    }

    if (user.role === 'doctor') {
        return userIdentifiers(user).has(normalize(session.doctorId));
    }

    if (user.role === 'patient') {
        return userIdentifiers(user).has(normalize(session.patientId));
    }

    return false;
};

/**
 * Time window: allow joining anytime until scheduled end + grace (no "1 hour before" gate).
 * Aligns with paid consults where parties may connect flexibly.
 */
const canJoinSessionNow = (session) => {
    const end = new Date(session?.scheduledEndAt || 0).getTime();
    if (!Number.isFinite(end)) {
        return {
            allowed: false,
            reason: 'Session schedule is invalid.'
        };
    }

    const graceMinutes = env.joinGraceAfterEndMinutes;
    const graceMs = graceMinutes * 60 * 1000;
    const now = Date.now();

    if (now > end + graceMs) {
        return {
            allowed: false,
            reason: 'Session has already ended.'
        };
    }

    return { allowed: true, reason: '' };
};

/**
 * Join / video-token: time window only (patient or doctor may connect first).
 */
const assertTelemedicineVideoAccess = (user, session) => {
    const timeOk = canJoinSessionNow(session);
    if (!timeOk.allowed) {
        return { ...timeOk, code: 'OUTSIDE_JOIN_WINDOW' };
    }

    return { allowed: true, reason: '', code: '' };
};

module.exports = {
    canAccessSession,
    canJoinSessionNow,
    assertTelemedicineVideoAccess
};
