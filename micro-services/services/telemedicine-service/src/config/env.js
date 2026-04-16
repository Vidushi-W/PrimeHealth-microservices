const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
    port: parseInteger(process.env.PORT, 5002),
    mongoUri: process.env.MONGO_URI || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    videoProvider: (process.env.VIDEO_PROVIDER || 'jitsi').toLowerCase(),
    jitsiBaseUrl: process.env.JITSI_BASE_URL || 'https://meet.jit.si',
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
    chatPreMinutes: parseInteger(process.env.CHAT_PRE_MINUTES, 30),
    chatPostMinutes: parseInteger(process.env.CHAT_POST_MINUTES, 120)
};
