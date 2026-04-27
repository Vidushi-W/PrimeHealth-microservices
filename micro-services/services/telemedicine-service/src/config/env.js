const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    return fallback;
};

module.exports = {
    /** Default 5006 avoids clashing with doctor-service (5002) in local dev */
    port: parseInteger(process.env.PORT, 5006),
    mongoUri: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    appointmentServiceUrl: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:5003',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || '',
    videoProvider: (process.env.VIDEO_PROVIDER || 'jitsi').toLowerCase(),
    jitsiBaseUrl: process.env.JITSI_BASE_URL || 'https://meet.jit.si',
    jaasAppId: process.env.JAAS_APP_ID || '',
    jaasKid: process.env.JAAS_KID || '',
    jaasPrivateKey: process.env.JAAS_PRIVATE_KEY || '',
    jaasPrivateKeyBase64: process.env.JAAS_PRIVATE_KEY_BASE64 || '',
    jaasExternalApiUrl: process.env.JAAS_EXTERNAL_API_URL || '',
    /** Minutes before scheduled start that join / video-token are allowed */
    joinOpenBeforeStartMinutes: parseInteger(process.env.TELEMEDICINE_JOIN_OPEN_BEFORE_START_MINUTES, 10),
    /** Minutes after scheduled end that join / video-token are still allowed */
    joinGraceAfterEndMinutes: parseInteger(process.env.TELEMEDICINE_JOIN_GRACE_AFTER_END_MINUTES, 30),
    /** When true, patients must wait until doctor starts session before receiving video token. */
    doctorHostRequired: parseBoolean(process.env.TELEMEDICINE_DOCTOR_HOST_REQUIRED, true),
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        apiKey: process.env.TWILIO_API_KEY || '',
        apiSecret: process.env.TWILIO_API_SECRET || '',
        roomTtlSeconds: parseInteger(process.env.TWILIO_ROOM_TTL_SECONDS, 3600)
    },
    agora: {
        appId: process.env.AGORA_APP_ID || '',
        appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
        tokenTtlSeconds: parseInteger(process.env.AGORA_TOKEN_TTL_SECONDS, 3600)
    },
    chatPreMinutes: parseInteger(process.env.CHAT_PRE_MINUTES, 60),
    chatPostMinutes: parseInteger(process.env.CHAT_POST_MINUTES, 120)
};
