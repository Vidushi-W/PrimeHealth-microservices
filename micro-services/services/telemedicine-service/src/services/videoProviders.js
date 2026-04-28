const crypto = require('crypto');
const Twilio = require('twilio');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const env = require('../config/env');
const { buildJaasToken } = require('./jaasJwt');

const sanitizeRoomSegment = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120);

const getRoomName = (appointmentId) => {
    const suffix = appointmentId
        ? `primehealth-${sanitizeRoomSegment(appointmentId)}`
        : `primehealth-${crypto.randomUUID()}`;

    if (env.videoProvider === 'jitsi' && env.jaasAppId) {
        return `${env.jaasAppId}/${suffix}`;
    }

    return suffix;
};

const buildJitsiSession = (session, user) => {
    const roomUrl = `${env.jitsiBaseUrl.replace(/\/$/, '')}/${session.roomName}`;
    const externalApiUrl = env.jaasExternalApiUrl
        || (env.jaasAppId ? `https://8x8.vc/${env.jaasAppId}/external_api.js` : `${env.jitsiBaseUrl.replace(/\/$/, '')}/external_api.js`);

    const role = String(user?.role || '').toLowerCase();
    const moderator = role === 'doctor' || role === 'admin';
    const token = buildJaasToken({
        roomName: session.roomName,
        user,
        moderator
    });

    return {
        provider: 'jitsi',
        roomName: session.roomName,
        roomUrl,
        externalApiUrl,
        token,
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

    return buildJitsiSession(session, user);
};

module.exports = {
    getRoomName,
    generateVideoSessionPayload
};
