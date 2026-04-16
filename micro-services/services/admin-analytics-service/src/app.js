const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');
const Admin = require('./models/Admin');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Transaction = require('./models/Transaction');
const Appointment = require('./models/Appointment');
const AuditLog = require('./models/AuditLog');
const { getNextUniqueIdForRole, syncCounterForRole } = require('./utils/uniqueUserId');

const { requirePermission, RBAC } = auth;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

app.use(cors());
app.use(express.json());

const hasRequiredConfig = () => Boolean(process.env.MONGO_URI && process.env.JWT_SECRET);
const isDatabaseReady = () => mongoose.connection.readyState === 1;

const getServiceReadinessError = () => {
    if (!process.env.MONGO_URI) {
        return 'Service configuration missing: MONGO_URI is not set.';
    }

    if (!process.env.JWT_SECRET) {
        return 'Service configuration missing: JWT_SECRET is not set.';
    }

    if (!isDatabaseReady()) {
        return 'Database is not connected. Provide a valid MongoDB URI and restart the service.';
    }

    return null;
};

const requireServiceReady = (req, res, next) => {
    const readinessError = getServiceReadinessError();

    if (readinessError) {
        return res.status(503).json({
            success: false,
            message: readinessError
        });
    }

    return next();
};

const connectDatabase = async () => {
    if (!process.env.MONGO_URI) {
        console.warn('MONGO_URI is not set. Starting API without DB connection.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        await ensureUserUniqueIds();
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
    }
};

const managedRoleConfig = {
    admin: { model: Admin, searchFields: ['email'] },
    doctor: { model: Doctor, searchFields: ['name', 'email', 'specialty'] },
    patient: { model: Patient, searchFields: ['name', 'email'] }
};

const authRoleConfig = {
    admin: { model: Admin, defaultStatus: 'active' },
    doctor: { model: Doctor, defaultStatus: 'active' },
    patient: { model: Patient, defaultStatus: 'active' }
};

const allowedUserStatuses = new Set(['active', 'inactive', 'pending', 'verified', 'suspended', 'deactivated']);
const allowedSortFields = new Set(['createdAt', 'updatedAt', 'name', 'email', 'status', 'lastActiveAt', 'lastLoginAt', 'uniqueId']);
const allowedAdminRoles = new Set(Object.keys(RBAC));
const allowedAuthRoles = new Set(Object.keys(authRoleConfig));

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeEmail = (email) => (typeof email === 'string' ? email.toLowerCase().trim() : '');

const buildUserIdentifierQuery = (id) => {
    const normalizedId = typeof id === 'string' ? id.trim() : '';

    if (!normalizedId) {
        return null;
    }

    if (isValidObjectId(normalizedId)) {
        return { _id: normalizedId };
    }

    return { uniqueId: normalizedId.toUpperCase() };
};

const sanitizeUserDoc = (userDoc) => {
    if (!userDoc) {
        return null;
    }

    const raw = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    delete raw.passwordHash;
    return raw;
};

const issueAuthToken = (payload) =>
    jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

const isAuthRoleAllowed = (role) => allowedAuthRoles.has(role);

const getAuthModel = (role) => authRoleConfig[role]?.model || null;

const parseDuplicateKeyError = (error, entityName) => {
    if (error && error.code === 11000) {
        return `${entityName} with this email already exists.`;
    }

    return null;
};

const toSafeAdmin = (adminDoc) => ({
    _id: adminDoc._id,
    uniqueId: adminDoc.uniqueId || '',
    email: adminDoc.email,
    role: adminDoc.role,
    permissions: adminDoc.permissions || [],
    status: adminDoc.status,
    lastLoginAt: adminDoc.lastLoginAt || null,
    lastActiveAt: adminDoc.lastActiveAt || null,
    createdAt: adminDoc.createdAt,
    updatedAt: adminDoc.updatedAt
});

const toSafeUser = (role, userDoc) => {
    if (!userDoc) {
        return null;
    }

    const raw = sanitizeUserDoc(userDoc);

    return {
        ...raw,
        roleType: role
    };
};

const assignUniqueIdsForExistingUsers = async (roleKey, model) => {
    const missingUniqueIdFilter = {
        $or: [{ uniqueId: { $exists: false } }, { uniqueId: null }, { uniqueId: '' }]
    };

    const usersWithoutUniqueId = await model
        .find(missingUniqueIdFilter)
        .sort({ createdAt: 1, _id: 1 })
        .select('_id')
        .lean();

    if (!usersWithoutUniqueId.length) {
        return 0;
    }

    for (const user of usersWithoutUniqueId) {
        const nextUniqueId = await getNextUniqueIdForRole(roleKey);

        await model.updateOne(
            {
                _id: user._id,
                $or: [{ uniqueId: { $exists: false } }, { uniqueId: null }, { uniqueId: '' }]
            },
            { $set: { uniqueId: nextUniqueId } }
        );
    }

    return usersWithoutUniqueId.length;
};

const ensureUserUniqueIds = async () => {
    const roleModelPairs = [
        { roleKey: 'admin', model: Admin },
        { roleKey: 'doctor', model: Doctor },
        { roleKey: 'patient', model: Patient }
    ];

    for (const rolePair of roleModelPairs) {
        await syncCounterForRole(rolePair.roleKey, rolePair.model);
    }

    const assignmentStats = {};

    for (const rolePair of roleModelPairs) {
        const count = await assignUniqueIdsForExistingUsers(rolePair.roleKey, rolePair.model);
        assignmentStats[rolePair.roleKey] = count;
    }

    const totalAssigned = Object.values(assignmentStats).reduce((sum, value) => sum + value, 0);

    if (totalAssigned > 0) {
        console.log(
            `Backfilled unique IDs: admins=${assignmentStats.admin || 0}, doctors=${assignmentStats.doctor || 0}, patients=${assignmentStats.patient || 0}`
        );
    }
};

const getRoleModel = (role) => managedRoleConfig[role]?.model || null;

const parsePagination = (query) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
};

const getSortConfig = (query) => {
    const sortBy = allowedSortFields.has(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    return { [sortBy]: sortOrder };
};

const buildUserFilter = (role, query) => {
    const filter = {};
    const andClauses = [];

    if (query.status) {
        filter.status = query.status;
    }

    if (query.search) {
        const regex = new RegExp(query.search.trim(), 'i');
        const searchFields = managedRoleConfig[role].searchFields;
        andClauses.push({ $or: searchFields.map((field) => ({ [field]: regex })) });
    }

    if (role === 'admin' && query.adminRole) {
        filter.role = query.adminRole;
    }

    if (role === 'doctor' && query.specialty) {
        filter.specialty = new RegExp(query.specialty.trim(), 'i');
    }

    if (query.activityFrom || query.activityTo) {
        filter.lastActiveAt = {};

        if (query.activityFrom) {
            filter.lastActiveAt.$gte = new Date(query.activityFrom);
        }

        if (query.activityTo) {
            filter.lastActiveAt.$lte = new Date(query.activityTo);
        }
    }

    if (query.includeDeleted !== 'true') {
        andClauses.push({ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] });
    }

    if (andClauses.length > 0) {
        filter.$and = andClauses;
    }

    return filter;
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }

    return req.ip || '';
};

const logAudit = async (req, payload) => {
    try {
        const actor = req.adminProfile;

        if (!actor) {
            return;
        }

        await AuditLog.create({
            actorAdminId: actor._id,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: payload.action,
            targetType: payload.targetType || '',
            targetId: payload.targetId || '',
            targetEmail: payload.targetEmail || '',
            metadata: payload.metadata || {},
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || ''
        });
    } catch (error) {
        console.error('Audit log write failed:', error.message);
    }
};

const logAuditForActor = async (req, actor, payload) => {
    try {
        await AuditLog.create({
            actorAdminId: actor._id,
            actorEmail: actor.email,
            actorRole: actor.role,
            action: payload.action,
            targetType: payload.targetType || '',
            targetId: payload.targetId || '',
            targetEmail: payload.targetEmail || '',
            metadata: payload.metadata || {},
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || ''
        });
    } catch (error) {
        console.error('Audit log write failed:', error.message);
    }
};

const ensureValidRole = (role, res) => {
    if (!managedRoleConfig[role]) {
        res.status(400).json({
            success: false,
            message: 'Invalid role. Allowed values: admin, doctor, patient.'
        });
        return false;
    }

    return true;
};

// --- Authentication Routes ---

app.post('/api/admin/bootstrap', requireServiceReady, async (req, res) => {
    try {
        const existingAdmins = await Admin.countDocuments();

        if (existingAdmins > 0) {
            return res.status(409).json({
                success: false,
                message: 'Bootstrap is disabled because at least one admin already exists.'
            });
        }

        const { email, password, role, permissions } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        const adminRole = role || 'super_admin';

        if (!allowedAdminRoles.has(adminRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid admin role. Allowed values: ${Array.from(allowedAdminRoles).join(', ')}`
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.create({
            email: normalizeEmail(email),
            passwordHash,
            role: adminRole,
            permissions: Array.isArray(permissions) ? permissions : [],
            status: 'active',
            lastActiveAt: new Date()
        });

        return res.status(201).json({
            success: true,
            message: 'Initial admin created successfully.',
            admin: toSafeAdmin(admin)
        });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Admin');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Bootstrap failed', error: error.message });
    }
});

app.post('/api/auth/register', requireServiceReady, async (req, res) => {
    try {
        const { role, email, password, name, specialty } = req.body;

        if (!role || !isAuthRoleAllowed(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Allowed values: admin, doctor, patient.'
            });
        }

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        if ((role === 'doctor' || role === 'patient') && !name) {
            return res.status(400).json({ success: false, message: 'Name is required for doctor and patient registration.' });
        }

        const model = getAuthModel(role);
        const passwordHash = await bcrypt.hash(password, 10);
        const commonFields = {
            email: normalizeEmail(email),
            passwordHash,
            status: authRoleConfig[role].defaultStatus,
            lastActiveAt: new Date()
        };

        let createdUser;

        if (role === 'admin') {
            createdUser = await model.create({
                ...commonFields,
                role: 'admin',
                permissions: []
            });
        } else if (role === 'doctor') {
            createdUser = await model.create({
                ...commonFields,
                name,
                specialty: specialty || '',
                permissions: []
            });
        } else {
            createdUser = await model.create({
                ...commonFields,
                name,
                permissions: []
            });
        }

        return res.status(201).json({
            success: true,
            message: `${role} account registered successfully.`,
            user: role === 'admin' ? toSafeAdmin(createdUser) : toSafeUser(role, createdUser)
        });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'User');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

app.post('/api/auth/login', requireServiceReady, async (req, res) => {
    try {
        const { role, email, password } = req.body;

        if (!role || !isAuthRoleAllowed(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Allowed values: admin, doctor, patient.'
            });
        }

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const model = getAuthModel(role);
        const user = await model.findOne({ email: normalizeEmail(email) });

        if (!user || !user.passwordHash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!['active', 'verified'].includes(user.status)) {
            return res.status(403).json({ success: false, message: `Account is ${user.status}. Access denied.` });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const now = new Date();
        user.lastLoginAt = now;
        user.lastActiveAt = now;
        user.lastLoginIp = getClientIp(req);
        user.lastLoginUserAgent = req.headers['user-agent'] || '';
        await user.save();

        const tokenPayload = {
            id: user._id.toString(),
            roleType: role,
            role: role === 'admin' ? user.role || 'admin' : role
        };
        const token = issueAuthToken(tokenPayload);

        if (role === 'admin') {
            await logAuditForActor(req, user, {
                action: 'admin.login',
                targetType: 'admin',
                targetId: user._id.toString(),
                targetEmail: user.email
            });
        }

        return res.json({
            success: true,
            token,
            role,
            user: role === 'admin' ? toSafeAdmin(user) : toSafeUser(role, user)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

app.post('/api/admin/login', requireServiceReady, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const admin = await Admin.findOne({ email: normalizeEmail(email) });

        if (!admin || !admin.passwordHash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!['active', 'verified'].includes(admin.status)) {
            return res.status(403).json({
                success: false,
                message: `Account is ${admin.status}. Please contact a super admin.`
            });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const now = new Date();
        admin.lastLoginAt = now;
        admin.lastActiveAt = now;
        admin.lastLoginIp = getClientIp(req);
        admin.lastLoginUserAgent = req.headers['user-agent'] || '';
        await admin.save();

        const token = issueAuthToken({
            id: admin._id.toString(),
            role: admin.role || 'admin'
        });

        await logAuditForActor(req, admin, {
            action: 'admin.login',
            targetType: 'admin',
            targetId: admin._id.toString(),
            targetEmail: admin.email
        });

        return res.json({ success: true, token });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

// --- Advanced User Management ---

app.get('/api/admin/users', requireServiceReady, auth, requirePermission('user.read'), async (req, res) => {
    try {
        const { role } = req.query;
        const pagination = parsePagination(req.query);
        const sort = getSortConfig(req.query);

        if (role) {
            if (!ensureValidRole(role, res)) {
                return;
            }

            const model = getRoleModel(role);
            const filter = buildUserFilter(role, req.query);
            const projection = role === 'admin' ? '-passwordHash' : '';

            const [items, total] = await Promise.all([
                model.find(filter).select(projection).sort(sort).skip(pagination.skip).limit(pagination.limit),
                model.countDocuments(filter)
            ]);

            return res.json({
                success: true,
                role,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages: Math.ceil(total / pagination.limit) || 1
                },
                users: items.map((item) => toSafeUser(role, item))
            });
        }

        const roles = Object.keys(managedRoleConfig);
        const perRoleLimit = Math.min(200, pagination.limit * 2);

        const roleResults = await Promise.all(
            roles.map(async (currentRole) => {
                const model = getRoleModel(currentRole);
                const projection = currentRole === 'admin' ? '-passwordHash' : '';
                const filter = buildUserFilter(currentRole, req.query);
                const docs = await model.find(filter).select(projection).sort(sort).limit(perRoleLimit);
                return docs.map((doc) => toSafeUser(currentRole, doc));
            })
        );

        const flattened = roleResults.flat();
        const sortKey = Object.keys(sort)[0];
        const sortDirection = sort[sortKey];

        flattened.sort((a, b) => {
            const left = a[sortKey] ?? '';
            const right = b[sortKey] ?? '';

            if (typeof left === 'string' || typeof right === 'string') {
                const leftValue = String(left).toLowerCase();
                const rightValue = String(right).toLowerCase();
                if (leftValue === rightValue) return 0;
                return sortDirection === 1 ? (leftValue > rightValue ? 1 : -1) : (leftValue > rightValue ? -1 : 1);
            }

            const leftDate = new Date(left).getTime();
            const rightDate = new Date(right).getTime();

            if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
                return sortDirection === 1 ? leftDate - rightDate : rightDate - leftDate;
            }

            const leftNumber = Number(left) || 0;
            const rightNumber = Number(right) || 0;
            return sortDirection === 1 ? leftNumber - rightNumber : rightNumber - leftNumber;
        });

        const total = flattened.length;
        const users = flattened.slice(pagination.skip, pagination.skip + pagination.limit);

        return res.json({
            success: true,
            role: 'all',
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1
            },
            users
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});

app.get('/api/admin/users/:role/:id/profile', requireServiceReady, auth, requirePermission('user.read'), async (req, res) => {
    try {
        const { role, id } = req.params;

        if (!ensureValidRole(role, res)) {
            return;
        }

        const userIdentifierQuery = buildUserIdentifierQuery(id);

        if (!userIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid user id format' });
        }

        const model = getRoleModel(role);
        const projection = role === 'admin' ? '-passwordHash' : '';
        const user = await model.findOne(userIdentifierQuery).select(projection);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const activityLimit = Math.min(200, Math.max(10, Number.parseInt(req.query.activityLimit, 10) || 50));

        const activityHistory = await AuditLog.find({
            $or: [
                { targetType: role, targetId: user._id.toString() },
                ...(role === 'admin' ? [{ actorAdminId: user._id.toString() }] : [])
            ]
        })
            .sort({ createdAt: -1 })
            .limit(activityLimit);

        return res.json({
            success: true,
            profile: toSafeUser(role, user),
            activityHistory
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user profile', error: error.message });
    }
});

app.patch('/api/admin/users/:role/:id', requireServiceReady, auth, requirePermission('user.update'), async (req, res) => {
    try {
        const { role, id } = req.params;

        if (!ensureValidRole(role, res)) {
            return;
        }

        const userIdentifierQuery = buildUserIdentifierQuery(id);

        if (!userIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid user id format' });
        }

        const updates = {};
        const { name, email, status, permissions, specialty, adminRole } = req.body;

        if (name !== undefined && role !== 'admin') {
            updates.name = name;
        }

        if (specialty !== undefined && role === 'doctor') {
            updates.specialty = specialty;
        }

        if (email !== undefined) {
            updates.email = normalizeEmail(email);
        }

        if (status !== undefined) {
            if (!allowedUserStatuses.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
                });
            }

            updates.status = status;
            updates.deletedAt = status === 'deactivated' ? new Date() : null;
        }

        if (permissions !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: permission.manage is required to update user permissions.'
                });
            }

            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
            }

            updates.permissions = permissions;
        }

        if (role === 'admin' && adminRole !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('role.assign')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: role.assign is required to update admin roles.'
                });
            }

            if (!allowedAdminRoles.has(adminRole)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid admin role. Allowed values: ${Array.from(allowedAdminRoles).join(', ')}`
                });
            }

            updates.role = adminRole;
        }

        updates.lastActiveAt = new Date();

        const model = getRoleModel(role);
        const projection = role === 'admin' ? '-passwordHash' : '';
        const updatedUser = await model.findOneAndUpdate(userIdentifierQuery, updates, { new: true }).select(projection);

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await logAudit(req, {
            action: `user.${role}.updated`,
            targetType: role,
            targetId: updatedUser._id.toString(),
            targetEmail: updatedUser.email || '',
            metadata: { updates: Object.keys(updates) }
        });

        return res.json({ success: true, user: toSafeUser(role, updatedUser) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'User');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    }
});

app.patch('/api/admin/users/:role/:id/status', requireServiceReady, auth, requirePermission('user.deactivate'), async (req, res) => {
    try {
        const { role, id } = req.params;
        const { status } = req.body;

        if (!ensureValidRole(role, res)) {
            return;
        }

        const userIdentifierQuery = buildUserIdentifierQuery(id);

        if (!userIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid user id format' });
        }

        if (!status || !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
            });
        }

        const updates = {
            status,
            deletedAt: status === 'deactivated' ? new Date() : null,
            lastActiveAt: new Date()
        };

        const model = getRoleModel(role);
        const projection = role === 'admin' ? '-passwordHash' : '';
        const user = await model.findOneAndUpdate(userIdentifierQuery, updates, { new: true }).select(projection);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await logAudit(req, {
            action: `user.${role}.status.changed`,
            targetType: role,
            targetId: user._id.toString(),
            targetEmail: user.email || '',
            metadata: { status }
        });

        return res.json({ success: true, user: toSafeUser(role, user) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message });
    }
});

app.patch('/api/admin/users/:role/:id/deactivate', requireServiceReady, auth, requirePermission('user.deactivate'), async (req, res) => {
    try {
        const { role, id } = req.params;

        if (!ensureValidRole(role, res)) {
            return;
        }

        const userIdentifierQuery = buildUserIdentifierQuery(id);

        if (!userIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid user id format' });
        }

        const model = getRoleModel(role);
        const projection = role === 'admin' ? '-passwordHash' : '';

        const user = await model
            .findOneAndUpdate(
                userIdentifierQuery,
                { status: 'deactivated', deletedAt: new Date(), lastActiveAt: new Date() },
                { new: true }
            )
            .select(projection);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await logAudit(req, {
            action: `user.${role}.deactivated`,
            targetType: role,
            targetId: user._id.toString(),
            targetEmail: user.email || ''
        });

        return res.json({ success: true, user: toSafeUser(role, user) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to deactivate user', error: error.message });
    }
});

app.delete('/api/admin/users/:role/:id', requireServiceReady, auth, requirePermission('user.delete'), async (req, res) => {
    try {
        const { role, id } = req.params;

        if (!ensureValidRole(role, res)) {
            return;
        }

        const userIdentifierQuery = buildUserIdentifierQuery(id);

        if (!userIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid user id format' });
        }

        if (req.query.confirm !== 'DELETE') {
            return res.status(400).json({
                success: false,
                message: 'Hard delete requires confirm=DELETE query parameter.'
            });
        }

        const model = getRoleModel(role);
        const deleted = await model.findOneAndDelete(userIdentifierQuery);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await logAudit(req, {
            action: `user.${role}.deleted`,
            targetType: role,
            targetId: deleted._id.toString(),
            targetEmail: deleted.email || ''
        });

        return res.json({ success: true, message: `${role} account deleted permanently.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
});

// --- Existing Admin User Routes (Enhanced with RBAC + Audit) ---

app.get('/api/admin/users/admins', requireServiceReady, auth, requirePermission('user.read'), async (req, res) => {
    try {
        const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
        return res.json(admins.map((admin) => toSafeAdmin(admin)));
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch admins', error: error.message });
    }
});

app.post('/api/admin/users/admins', requireServiceReady, auth, requirePermission('user.create'), async (req, res) => {
    try {
        const { email, password, role, status, permissions } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const adminRole = role || 'admin';

        if (!allowedAdminRoles.has(adminRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid admin role. Allowed values: ${Array.from(allowedAdminRoles).join(', ')}`
            });
        }

        if (role && !req.adminPermissions.includes('*') && !req.adminPermissions.includes('role.assign')) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: role.assign is required to assign admin roles.'
            });
        }

        if (permissions && !req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: permission.manage is required to assign permissions.'
            });
        }

        if (status && !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.create({
            email: normalizeEmail(email),
            passwordHash,
            role: adminRole,
            permissions: Array.isArray(permissions) ? permissions : [],
            status: status || 'active',
            lastActiveAt: new Date()
        });

        await logAudit(req, {
            action: 'user.admin.created',
            targetType: 'admin',
            targetId: admin._id.toString(),
            targetEmail: admin.email,
            metadata: { role: admin.role, status: admin.status }
        });

        return res.status(201).json({ success: true, admin: toSafeAdmin(admin) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Admin');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to create admin', error: error.message });
    }
});

app.patch('/api/admin/users/admins/:id/status', requireServiceReady, auth, requirePermission('user.deactivate'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid admin id format' });
        }

        const { status } = req.body;

        if (!status || !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
            });
        }

        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            { status, deletedAt: status === 'deactivated' ? new Date() : null, lastActiveAt: new Date() },
            { new: true }
        ).select('-passwordHash');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        await logAudit(req, {
            action: 'user.admin.status.changed',
            targetType: 'admin',
            targetId: admin._id.toString(),
            targetEmail: admin.email,
            metadata: { status }
        });

        return res.json({ success: true, admin: toSafeAdmin(admin) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update admin status', error: error.message });
    }
});

app.patch('/api/admin/users/admins/:id/password', requireServiceReady, auth, requirePermission('user.update'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid admin id format' });
        }

        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            { passwordHash, lastActiveAt: new Date() },
            { new: true }
        ).select('-passwordHash');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        await logAudit(req, {
            action: 'user.admin.password.changed',
            targetType: 'admin',
            targetId: admin._id.toString(),
            targetEmail: admin.email
        });

        return res.json({ success: true, message: 'Admin password updated successfully.', admin: toSafeAdmin(admin) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update admin password', error: error.message });
    }
});

// --- Analytics Endpoints ---

app.get('/api/admin/analytics/summary', requireServiceReady, auth, requirePermission('analytics.read'), async (req, res) => {
    try {
        const [totalAdmins, totalDoctors, totalPatients] = await Promise.all([
            Admin.countDocuments(),
            Doctor.countDocuments(),
            Patient.countDocuments()
        ]);

        const revenueAggregation = await Transaction.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const totalRevenue = revenueAggregation.length ? revenueAggregation[0].total : 0;

        return res.json({
            totalUsers: totalAdmins + totalDoctors + totalPatients,
            totalDoctors,
            totalPatients,
            revenue: {
                total: totalRevenue,
                currency: 'LKR'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch analytics summary', error: error.message });
    }
});

app.get('/api/admin/analytics/appointments', requireServiceReady, auth, requirePermission('analytics.read'), async (req, res) => {
    try {
        const byDay = await Appointment.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    count: 1
                }
            }
        ]);

        const byStatusAggregation = await Appointment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const byStatus = byStatusAggregation.reduce((acc, item) => {
            if (item._id) {
                acc[item._id] = item.count;
            }

            return acc;
        }, {});

        return res.json({ byDay, byStatus });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch appointment analytics', error: error.message });
    }
});

// --- Doctor and Patient Management ---

app.get('/api/admin/users/doctors', requireServiceReady, auth, requirePermission('user.read'), async (req, res) => {
    try {
        const doctorList = await Doctor.find().sort({ createdAt: -1 });
        return res.json(doctorList.map((doctor) => toSafeUser('doctor', doctor)));
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message });
    }
});

app.post('/api/admin/users/doctors', requireServiceReady, auth, requirePermission('user.create'), async (req, res) => {
    try {
        const { name, specialty, email, status, permissions, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        if (status && !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
            });
        }

        if (permissions !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: permission.manage is required to assign permissions.'
                });
            }

            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
            }
        }

        if (password !== undefined) {
            if (typeof password !== 'string' || password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long when provided.'
                });
            }
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : '';

        const doctor = await Doctor.create({
            name,
            specialty: specialty || '',
            email: normalizeEmail(email),
            status: status || 'pending',
            passwordHash,
            permissions: Array.isArray(permissions) ? permissions : [],
            lastActiveAt: new Date()
        });

        await logAudit(req, {
            action: 'user.doctor.created',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email,
            metadata: { status: doctor.status }
        });

        return res.status(201).json({ success: true, doctor: toSafeUser('doctor', doctor) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Doctor');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to create doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id', requireServiceReady, auth, requirePermission('user.update'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const updates = {};
        const { name, specialty, email, status, permissions } = req.body;

        if (name !== undefined) updates.name = name;
        if (specialty !== undefined) updates.specialty = specialty;
        if (email !== undefined) updates.email = normalizeEmail(email);

        if (status !== undefined) {
            if (!allowedUserStatuses.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
                });
            }

            updates.status = status;
            updates.deletedAt = status === 'deactivated' ? new Date() : null;
        }

        if (permissions !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: permission.manage is required to update user permissions.'
                });
            }

            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
            }

            updates.permissions = permissions;
        }

        updates.lastActiveAt = new Date();

        const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        await logAudit(req, {
            action: 'user.doctor.updated',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email,
            metadata: { updates: Object.keys(updates) }
        });

        return res.json({ success: true, doctor: toSafeUser('doctor', doctor) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Doctor');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to update doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/verify', requireServiceReady, auth, requirePermission('doctor.verify'), async (req, res) => {
    try {
        const doctorIdentifierQuery = buildUserIdentifierQuery(req.params.id);

        if (!doctorIdentifierQuery) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const doctor = await Doctor.findOneAndUpdate(
            doctorIdentifierQuery,
            { status: 'verified', lastActiveAt: new Date(), deletedAt: null },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        await logAudit(req, {
            action: 'user.doctor.verified',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email
        });

        return res.json({ success: true, message: `Doctor ${doctor.name} verified successfully`, doctor: toSafeUser('doctor', doctor) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/deactivate', requireServiceReady, auth, requirePermission('user.deactivate'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { status: 'deactivated', deletedAt: new Date(), lastActiveAt: new Date() },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        await logAudit(req, {
            action: 'user.doctor.deactivated',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email
        });

        return res.json({ success: true, message: `Doctor ${doctor.name} deactivated successfully`, doctor: toSafeUser('doctor', doctor) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to deactivate doctor', error: error.message });
    }
});

app.post('/api/admin/users/doctors/:id/documents', requireServiceReady, auth, requirePermission('user.update'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const { type, url, notes } = req.body;

        if (!type || !url) {
            return res.status(400).json({ success: false, message: 'type and url are required for doctor documents.' });
        }

        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        doctor.documents.push({
            type,
            url,
            notes: notes || '',
            status: 'pending',
            uploadedAt: new Date()
        });
        doctor.lastActiveAt = new Date();

        await doctor.save();

        const document = doctor.documents[doctor.documents.length - 1];

        await logAudit(req, {
            action: 'doctor.document.uploaded',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email,
            metadata: { documentId: document._id.toString(), type: document.type }
        });

        return res.status(201).json({ success: true, doctor: toSafeUser('doctor', doctor), document });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to add doctor document', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/documents/:documentId/verify', requireServiceReady, auth, requirePermission('doctor.verify'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.documentId)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id or document id format' });
        }

        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        const document = doctor.documents.id(req.params.documentId);

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        document.status = 'verified';
        document.verifiedAt = new Date();
        document.verifiedBy = req.adminProfile._id;
        doctor.status = 'verified';
        doctor.deletedAt = null;
        doctor.lastActiveAt = new Date();
        await doctor.save();

        await logAudit(req, {
            action: 'doctor.document.verified',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email,
            metadata: { documentId: document._id.toString(), type: document.type }
        });

        return res.json({ success: true, message: 'Doctor document verified', doctor: toSafeUser('doctor', doctor), document });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify doctor document', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/documents/:documentId/reject', requireServiceReady, auth, requirePermission('doctor.verify'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.documentId)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id or document id format' });
        }

        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        const document = doctor.documents.id(req.params.documentId);

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        document.status = 'rejected';
        document.verifiedAt = new Date();
        document.verifiedBy = req.adminProfile._id;
        document.notes = req.body.notes || document.notes || '';
        doctor.lastActiveAt = new Date();
        await doctor.save();

        await logAudit(req, {
            action: 'doctor.document.rejected',
            targetType: 'doctor',
            targetId: doctor._id.toString(),
            targetEmail: doctor.email,
            metadata: {
                documentId: document._id.toString(),
                type: document.type,
                notes: document.notes
            }
        });

        return res.json({ success: true, message: 'Doctor document rejected', doctor: toSafeUser('doctor', doctor), document });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject doctor document', error: error.message });
    }
});

app.get('/api/admin/users/patients', requireServiceReady, auth, requirePermission('user.read'), async (req, res) => {
    try {
        const patientList = await Patient.find().sort({ createdAt: -1 });
        return res.json(patientList.map((patient) => toSafeUser('patient', patient)));
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch patients', error: error.message });
    }
});

app.post('/api/admin/users/patients', requireServiceReady, auth, requirePermission('user.create'), async (req, res) => {
    try {
        const { name, email, status, permissions, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        if (status && !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
            });
        }

        if (permissions !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: permission.manage is required to assign permissions.'
                });
            }

            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
            }
        }

        if (password !== undefined) {
            if (typeof password !== 'string' || password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long when provided.'
                });
            }
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : '';

        const patient = await Patient.create({
            name,
            email: normalizeEmail(email),
            status: status || 'active',
            passwordHash,
            permissions: Array.isArray(permissions) ? permissions : [],
            lastActiveAt: new Date()
        });

        await logAudit(req, {
            action: 'user.patient.created',
            targetType: 'patient',
            targetId: patient._id.toString(),
            targetEmail: patient.email,
            metadata: { status: patient.status }
        });

        return res.status(201).json({ success: true, patient: toSafeUser('patient', patient) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Patient');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to create patient', error: error.message });
    }
});

app.patch('/api/admin/users/patients/:id', requireServiceReady, auth, requirePermission('user.update'), async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid patient id format' });
        }

        const updates = {};
        const { name, email, status, permissions } = req.body;

        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = normalizeEmail(email);

        if (status !== undefined) {
            if (!allowedUserStatuses.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Allowed values: active, inactive, pending, verified, suspended, deactivated.'
                });
            }

            updates.status = status;
            updates.deletedAt = status === 'deactivated' ? new Date() : null;
        }

        if (permissions !== undefined) {
            if (!req.adminPermissions.includes('*') && !req.adminPermissions.includes('permission.manage')) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: permission.manage is required to update user permissions.'
                });
            }

            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: 'permissions must be an array of strings.' });
            }

            updates.permissions = permissions;
        }

        updates.lastActiveAt = new Date();

        const patient = await Patient.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        await logAudit(req, {
            action: 'user.patient.updated',
            targetType: 'patient',
            targetId: patient._id.toString(),
            targetEmail: patient.email,
            metadata: { updates: Object.keys(updates) }
        });

        return res.json({ success: true, patient: toSafeUser('patient', patient) });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Patient');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to update patient', error: error.message });
    }
});

// --- Audit and Finance ---

app.get('/api/admin/audit-logs', requireServiceReady, auth, requirePermission('audit.read'), async (req, res) => {
    try {
        const pagination = parsePagination(req.query);
        const filter = {};

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.targetType) {
            filter.targetType = req.query.targetType;
        }

        if (req.query.actorEmail) {
            filter.actorEmail = new RegExp(req.query.actorEmail.trim(), 'i');
        }

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};

            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate);
            }

            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate);
            }
        }

        const [items, total] = await Promise.all([
            AuditLog.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
            AuditLog.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1
            },
            logs: items
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
    }
});

app.get('/api/admin/finance/transactions', requireServiceReady, auth, requirePermission('finance.read'), async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(200);
        return res.json(transactions);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
    }
});

// --- Health and Metadata ---

app.get('/health', (req, res) => {
    const readinessError = getServiceReadinessError();

    res.status(200).json({
        service: 'admin-analytics-service',
        status: readinessError ? 'degraded' : 'healthy',
        database: isDatabaseReady() ? 'connected' : 'disconnected',
        config: hasRequiredConfig() ? 'loaded' : 'missing',
        message: readinessError,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/admin/meta', (req, res) => {
    res.status(200).json({
        service: 'admin-analytics-service',
        version: '2.0.0',
        roleScope: {
            admin: [
                'Manage user accounts',
                'Verify doctor registrations',
                'Oversee platform operations',
                'Monitor financial transactions'
            ]
        },
        rbac: {
            roles: RBAC,
            notes: 'permissions from role + custom admin permissions are merged at runtime.'
        },
        auth: {
            type: 'Bearer JWT',
            loginEndpoint: '/api/auth/login',
            registerEndpoint: '/api/auth/register',
            header: 'Authorization: Bearer <token>',
            notes: 'JWT_SECRET must be provided in environment variables.'
        },
        dataSource: 'MongoDB',
        mongoRequirement: 'MONGO_URI must point to an active MongoDB instance (Atlas or local).',
        endpoints: [
            { method: 'POST', path: '/api/auth/register', authRequired: false },
            { method: 'POST', path: '/api/auth/login', authRequired: false },
            { method: 'POST', path: '/api/admin/bootstrap', authRequired: false },
            { method: 'POST', path: '/api/admin/login', authRequired: false },
            { method: 'GET', path: '/api/admin/users', authRequired: true, permission: 'user.read' },
            { method: 'GET', path: '/api/admin/users/:role/:id/profile', authRequired: true, permission: 'user.read' },
            { method: 'PATCH', path: '/api/admin/users/:role/:id', authRequired: true, permission: 'user.update' },
            { method: 'PATCH', path: '/api/admin/users/:role/:id/status', authRequired: true, permission: 'user.deactivate' },
            { method: 'DELETE', path: '/api/admin/users/:role/:id', authRequired: true, permission: 'user.delete' },
            { method: 'PATCH', path: '/api/admin/users/doctors/:id/verify', authRequired: true, permission: 'doctor.verify' },
            { method: 'POST', path: '/api/admin/users/doctors/:id/documents', authRequired: true, permission: 'user.update' },
            { method: 'PATCH', path: '/api/admin/users/doctors/:id/documents/:documentId/verify', authRequired: true, permission: 'doctor.verify' },
            { method: 'GET', path: '/api/admin/audit-logs', authRequired: true, permission: 'audit.read' },
            { method: 'GET', path: '/api/admin/analytics/summary', authRequired: true, permission: 'analytics.read' },
            { method: 'GET', path: '/api/admin/finance/transactions', authRequired: true, permission: 'finance.read' }
        ]
    });
});

app.get('/', (req, res) => {
    const readinessError = getServiceReadinessError();

    res.status(200).json({
        service: 'admin-analytics-service',
        status: readinessError ? 'running-with-errors' : 'running',
        health: '/health',
        meta: '/api/admin/meta',
        login: '/api/auth/login',
        register: '/api/auth/register',
        data: 'mongodb-only',
        message: readinessError
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

const start = async () => {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Admin Analytics Service running on port ${PORT}`);
    });
};

start();
