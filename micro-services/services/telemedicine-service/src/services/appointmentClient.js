const env = require('../config/env');

function normalizeAppointment(payload) {
    const data = payload?.data?.data ?? payload?.data ?? null;
    return data && typeof data === 'object' ? data : null;
}

async function fetchAppointmentById(appointmentId, userHeaders = {}) {
    const base = String(env.appointmentServiceUrl || '').trim().replace(/\/+$/, '');
    if (!base || !appointmentId) return null;

    const headers = {
        Accept: 'application/json',
        ...userHeaders
    };
    if (env.internalServiceToken) {
        headers['x-internal-service-token'] = env.internalServiceToken;
    }

    let timeoutHandle = null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) {
        timeoutHandle = setTimeout(() => controller.abort(), 8000);
    }

    let response;
    try {
        response = await fetch(`${base}/api/appointments/${encodeURIComponent(appointmentId)}`, {
            method: 'GET',
            headers,
            ...(controller ? { signal: controller.signal } : {})
        });
    } catch (_error) {
        return null;
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
        return null;
    }

    const payload = await response.json().catch(() => null);
    return normalizeAppointment(payload);
}

module.exports = {
    fetchAppointmentById
};
