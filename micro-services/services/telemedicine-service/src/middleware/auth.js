const jwt = require('jsonwebtoken');
const env = require('../config/env');

const getBearerToken = (headerValue) => {
    if (!headerValue || typeof headerValue !== 'string') {
        return '';
    }

    const [scheme, token] = headerValue.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return '';
    }

    return token.trim();
};

const normalizeAuthUser = (payload) => {
    const userId = String(payload.userId || payload.id || payload._id || '').trim();
    const role = String(payload.role || '').toLowerCase().trim();

    return {
        userId,
        role,
        email: payload.email || ''
    };
};

const auth = (req, res, next) => {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token is required.'
        });
    }

    if (!env.jwtSecret) {
        return res.status(503).json({
            success: false,
            message: 'Service configuration missing: JWT_SECRET is not set.'
        });
    }

    try {
        const payload = jwt.verify(token, env.jwtSecret);
        const user = normalizeAuthUser(payload);

        if (!user.userId || !user.role) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token payload.'
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission for this action.'
        });
    }

    return next();
};

module.exports = {
    auth,
    requireRole,
    normalizeAuthUser,
    getBearerToken
};
