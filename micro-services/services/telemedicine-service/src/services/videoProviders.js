const crypto = require('crypto');
const Twilio = require('twilio');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const env = require('../config/env');

const getRoomName = (appointmentId) => {
    if (appointmentId) {
        return `primehealth-${appointmentId}`;
    }

    return `primehealth-${crypto.randomUUID()}`;
};

const buildJitsiSession = (session) => {
    const roomUrl = `${env.jitsiBaseUrl.replace(/\/$/, '')}/${session.roomName}`;

    return {
        provider: 'jitsi',
        roomName: session.roomName,
        roomUrl,
        token: null,
        expiresInSeconds: null
    };
};

const buildTwilioSession = (session, user) => {
    const { accountSid, apiKey, apiSecret, roomTtlSeconds } = env.twilio;

    if (!accountSid || !apiKey || !apiSecret) {
        throw new Error('Twilio credentials are missing. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET.');
    }

    const identity = `${user.role}-${user.userId}`;
    const accessToken = new Twilio.jwt.AccessToken(accountSid, apiKey, apiSecret, {
        ttl: roomTtlSeconds,
        identity
    });

    const videoGrant = new Twilio.jwt.AccessToken.VideoGrant({ room: session.roomName });
    accessToken.addGrant(videoGrant);

    return {
        provider: 'twilio',
        roomName: session.roomName,
        roomUrl: null,
        token: accessToken.toJwt(),
        expiresInSeconds: roomTtlSeconds
    };
};

const buildAgoraSession = (session, user) => {
    const { appId, appCertificate, tokenTtlSeconds } = env.agora;

    if (!appId || !appCertificate) {
        throw new Error('Agora credentials are missing. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.');
    }

    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + tokenTtlSeconds;
    const uid = Number.parseInt(user.userId, 10) || 0;

    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        session.roomName,
        uid,
        RtcRole.PUBLISHER,
        expireAt
    );

    return {
        provider: 'agora',
        roomName: session.roomName,
        roomUrl: null,
        token,
        expiresInSeconds: tokenTtlSeconds
    };
};

const generateVideoSessionPayload = (session, user) => {
    if (session.provider === 'twilio') {
        return buildTwilioSession(session, user);
    }

    if (session.provider === 'agora') {
        return buildAgoraSession(session, user);
    }

    return buildJitsiSession(session);
};

module.exports = {
    getRoomName,
    generateVideoSessionPayload
};
