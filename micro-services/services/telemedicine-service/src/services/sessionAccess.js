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

const canJoinSessionNow = (session) => {
    // Time-window restrictions are intentionally disabled for the current workflow:
    // doctor can host anytime and patient can join whenever doctor has hosted.
    return { allowed: true, reason: '' };
};

const hasDoctorStarted = (session) => {
    const parts = session?.metadata?.participants || {};
    return Boolean(parts?.doctor?.joinedAt) || Boolean(session?.metadata?.doctorHasStarted);
};

const assertTelemedicineVideoAccess = (user, session) => {
    const doctorStarted = hasDoctorStarted(session);
    const role = String(user?.role || '').toLowerCase();

    // Testing/business rule: once doctor has hosted, allow patient re-join even after scheduled end window.
    if (role === 'patient' && doctorStarted) {
        return { allowed: true, reason: '', code: '' };
    }

    const timeOk = canJoinSessionNow(session);
    if (!timeOk.allowed) {
        return { ...timeOk, code: 'OUTSIDE_JOIN_WINDOW' };
    }

    if (env.doctorHostRequired && role === 'patient' && !doctorStarted) {
        return {
            allowed: false,
            reason: 'Please wait for your doctor to start the session.',
            code: 'WAITING_FOR_DOCTOR'
        };
    }

    return { allowed: true, reason: '', code: '' };
};

module.exports = {
    canAccessSession,
    canJoinSessionNow,
    assertTelemedicineVideoAccess
};
