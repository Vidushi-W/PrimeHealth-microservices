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
    const start = new Date(session?.scheduledStartAt || 0).getTime();
    const end = new Date(session?.scheduledEndAt || 0).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return {
            allowed: false,
            reason: 'Session schedule is invalid.'
        };
    }

    const now = Date.now();
    const joinOpensAt = start - (60 * 60 * 1000);
    if (now < joinOpensAt) {
        return {
            allowed: false,
            reason: 'Join is available 1 hour before the scheduled start.'
        };
    }

    if (now > end) {
        return {
            allowed: false,
            reason: 'Session has already ended.'
        };
    }

    return { allowed: true, reason: '' };
};

module.exports = {
    canAccessSession,
    canJoinSessionNow
};
