const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const RBAC = {
    super_admin: ['*'],
    admin: [
        'user.read',
        'user.create',
        'user.update',
        'user.deactivate',
        'user.delete',
        'doctor.verify',
        'analytics.read',
        'finance.read',
        'audit.read',
        'role.assign',
        'permission.manage'
    ],
    operations_admin: ['user.read', 'user.create', 'user.update', 'user.deactivate', 'doctor.verify', 'analytics.read', 'audit.read'],
    finance_admin: ['user.read', 'finance.read', 'audit.read']
};

const getRolePermissions = (role) => RBAC[role] || [];

const resolveAdminPermissions = (admin) => {
    const rolePermissions = getRolePermissions(admin.role);
    const customPermissions = Array.isArray(admin.permissions) ? admin.permissions : [];
    return Array.from(new Set([...rolePermissions, ...customPermissions]));
};

const hasPermission = (adminPermissions, permission) => {
    if (!permission) return true;
    return adminPermissions.includes('*') || adminPermissions.includes(permission);
};

const requirePermission = (requiredPermissions) => {
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return (req, res, next) => {
        const granted = req.adminPermissions || [];
        const missing = required.filter((permission) => !hasPermission(granted, permission));

        if (missing.length > 0) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: insufficient permissions.',
                missingPermissions: missing
            });
        }

        return next();
    };
};

const auth = async (req, res, next) => {
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

        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token payload.'
            });
        }

        const adminProfile = await Admin.findById(decoded.id).select('-passwordHash');

        if (!adminProfile) {
            return res.status(401).json({
                success: false,
                message: 'Admin account not found.'
            });
        }

        if (!['active', 'verified'].includes(adminProfile.status)) {
            return res.status(403).json({
                success: false,
                message: `Admin account is ${adminProfile.status}. Access denied.`
            });
        }

        const adminPermissions = resolveAdminPermissions(adminProfile);

        if (!adminPermissions.length) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: no permissions assigned to this account.'
            });
        }

        req.admin = decoded;
        req.adminProfile = adminProfile;
        req.adminPermissions = adminPermissions;
        return next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please authenticate as an admin.'
        });
    }
};

module.exports = auth;
module.exports.RBAC = RBAC;
module.exports.getRolePermissions = getRolePermissions;
module.exports.requirePermission = requirePermission;
