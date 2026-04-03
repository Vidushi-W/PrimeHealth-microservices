const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Missing or invalid Authorization header. Use Bearer token.'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(503).json({
                success: false,
                message: 'Service configuration missing: JWT_SECRET is not set.'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: admin role required.'
            });
        }

        req.admin = decoded;
        next();
    } catch (e) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please authenticate as an admin.'
        });
    }
};

module.exports = auth;
