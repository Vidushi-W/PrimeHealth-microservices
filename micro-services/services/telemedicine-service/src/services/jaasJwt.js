const jwt = require('jsonwebtoken');
const env = require('../config/env');

function resolvePrivateKey() {
    const raw = String(env.jaasPrivateKey || '').trim();
    if (raw) {
        return raw.replace(/\\n/g, '\n');
    }

    const b64 = String(env.jaasPrivateKeyBase64 || '').trim();
    if (!b64) return '';
    try {
        return Buffer.from(b64, 'base64').toString('utf8').trim();
    } catch (_error) {
        return '';
    }
}

function isJaasJwtConfigured() {
    return Boolean(String(env.jaasAppId || '').trim() && String(env.jaasKid || '').trim() && resolvePrivateKey());
}

function buildJaasToken({ roomName, user, moderator }) {
    if (!isJaasJwtConfigured()) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 60 * 60; // 1 hour
    const name = String(
        user?.displayName
        || user?.fullName
        || user?.name
        || user?.email
        || 'PrimeHealth User'
    ).trim();

    const payload = {
        aud: 'jitsi',
        iss: 'chat',
        iat: now,
        exp: expiresAt,
        nbf: now - 5,
        sub: String(env.jaasAppId),
        room: String(roomName || '*'),
        context: {
            user: {
                id: String(user?.userId || ''),
                name,
                email: String(user?.email || ''),
                moderator: Boolean(moderator),
                hidden_from_recorder: false
            }
        }
    };

    return jwt.sign(payload, resolvePrivateKey(), {
        algorithm: 'RS256',
        header: {
            kid: String(env.jaasKid),
            typ: 'JWT'
        }
    });
}

module.exports = {
    isJaasJwtConfigured,
    buildJaasToken
};
