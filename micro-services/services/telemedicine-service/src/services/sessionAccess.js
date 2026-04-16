const canAccessSession = (user, session) => {
    if (user.role === 'admin') {
        return true;
    }

    if (user.role === 'doctor') {
        return session.doctorId === user.userId;
    }

    if (user.role === 'patient') {
        return session.patientId === user.userId;
    }

    return false;
};

module.exports = {
    canAccessSession
};
