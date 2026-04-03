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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;

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
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
    }
};

const toSafeAdmin = (adminDoc) => ({
    _id: adminDoc._id,
    email: adminDoc.email,
    role: adminDoc.role,
    status: adminDoc.status,
    createdAt: adminDoc.createdAt,
    updatedAt: adminDoc.updatedAt
});

const parseDuplicateKeyError = (error, entityName) => {
    if (error && error.code === 11000) {
        return `${entityName} with this email already exists.`;
    }

    return null;
};

const allowedUserStatuses = new Set(['active', 'inactive', 'pending', 'verified', 'deactivated']);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

        const { email, password, role } = req.body;

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

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.create({
            email: email.toLowerCase(),
            passwordHash,
            role: role || 'admin',
            status: 'active'
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

app.post('/api/admin/login', requireServiceReady, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });

        if (!admin || !admin.passwordHash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id.toString(), role: admin.role || 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ success: true, token });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});

// --- Protected Admin Routes ---

app.get('/api/admin/users/admins', requireServiceReady, auth, async (req, res) => {
    try {
        const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
        return res.json(admins);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch admins', error: error.message });
    }
});

app.post('/api/admin/users/admins', requireServiceReady, auth, async (req, res) => {
    try {
        const { email, password, role, status } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.create({
            email: email.toLowerCase(),
            passwordHash,
            role: role || 'admin',
            status: status || 'active'
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

app.patch('/api/admin/users/admins/:id/status', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid admin id format' });
        }

        const { status } = req.body;

        if (!status || !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, deactivated.'
            });
        }

        const admin = await Admin.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        return res.json({ success: true, admin });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update admin status', error: error.message });
    }
});

app.patch('/api/admin/users/admins/:id/password', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid admin id format' });
        }

        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const admin = await Admin.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true }).select('-passwordHash');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        return res.json({ success: true, message: 'Admin password updated successfully.', admin });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update admin password', error: error.message });
    }
});

// Analytics Endpoints
app.get('/api/admin/analytics/summary', requireServiceReady, auth, async (req, res) => {
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

app.get('/api/admin/analytics/appointments', requireServiceReady, auth, async (req, res) => {
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

// User Management Endpoints
app.get('/api/admin/users/doctors', requireServiceReady, auth, async (req, res) => {
    try {
        const doctorList = await Doctor.find().sort({ createdAt: -1 });
        return res.json(doctorList);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message });
    }
});

app.post('/api/admin/users/doctors', requireServiceReady, auth, async (req, res) => {
    try {
        const { name, specialty, email, status } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        if (status && !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, deactivated.'
            });
        }

        const doctor = await Doctor.create({
            name,
            specialty: specialty || '',
            email: email.toLowerCase(),
            status: status || 'pending'
        });

        return res.status(201).json({ success: true, doctor });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Doctor');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to create doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const updates = {};
        const { name, specialty, email, status } = req.body;

        if (name !== undefined) updates.name = name;
        if (specialty !== undefined) updates.specialty = specialty;
        if (email !== undefined) updates.email = email.toLowerCase();

        if (status !== undefined) {
            if (!allowedUserStatuses.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Allowed values: active, inactive, pending, verified, deactivated.'
                });
            }

            updates.status = status;
        }

        const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        return res.json({ success: true, doctor });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Doctor');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to update doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/verify', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status: 'verified' }, { new: true });

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        return res.json({ success: true, message: `Doctor ${doctor.name} verified successfully`, doctor });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify doctor', error: error.message });
    }
});

app.patch('/api/admin/users/doctors/:id/deactivate', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid doctor id format' });
        }

        const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status: 'deactivated' }, { new: true });

        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        return res.json({ success: true, message: `Doctor ${doctor.name} deactivated successfully`, doctor });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to deactivate doctor', error: error.message });
    }
});

app.get('/api/admin/users/patients', requireServiceReady, auth, async (req, res) => {
    try {
        const patientList = await Patient.find().sort({ createdAt: -1 });
        return res.json(patientList);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch patients', error: error.message });
    }
});

app.post('/api/admin/users/patients', requireServiceReady, auth, async (req, res) => {
    try {
        const { name, email, status } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        if (status && !allowedUserStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Allowed values: active, inactive, pending, verified, deactivated.'
            });
        }

        const patient = await Patient.create({
            name,
            email: email.toLowerCase(),
            status: status || 'active'
        });

        return res.status(201).json({ success: true, patient });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Patient');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to create patient', error: error.message });
    }
});

app.patch('/api/admin/users/patients/:id', requireServiceReady, auth, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid patient id format' });
        }

        const updates = {};
        const { name, email, status } = req.body;

        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email.toLowerCase();

        if (status !== undefined) {
            if (!allowedUserStatuses.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Allowed values: active, inactive, pending, verified, deactivated.'
                });
            }

            updates.status = status;
        }

        const patient = await Patient.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        return res.json({ success: true, patient });
    } catch (error) {
        const duplicateMessage = parseDuplicateKeyError(error, 'Patient');

        if (duplicateMessage) {
            return res.status(409).json({ success: false, message: duplicateMessage });
        }

        return res.status(500).json({ success: false, message: 'Failed to update patient', error: error.message });
    }
});

// Financial Tracking
app.get('/api/admin/finance/transactions', requireServiceReady, auth, async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(200);
        return res.json(transactions);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
    }
});

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
        version: '1.0.0',
        auth: {
            type: 'Bearer JWT',
            loginEndpoint: '/api/admin/login',
            header: 'Authorization: Bearer <token>',
            notes: 'JWT_SECRET must be provided in environment variables.'
        },
        dataSource: 'MongoDB',
        mongoRequirement: 'MONGO_URI must point to an active MongoDB instance (Atlas or local).',
        endpoints: [
            { method: 'POST', path: '/api/admin/bootstrap', authRequired: false },
            { method: 'POST', path: '/api/admin/login', authRequired: false },
            { method: 'GET', path: '/api/admin/users/admins', authRequired: true },
            { method: 'POST', path: '/api/admin/users/admins', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/admins/:id/status', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/admins/:id/password', authRequired: true },
            { method: 'GET', path: '/api/admin/analytics/summary', authRequired: true },
            { method: 'GET', path: '/api/admin/analytics/appointments', authRequired: true },
            { method: 'GET', path: '/api/admin/users/doctors', authRequired: true },
            { method: 'POST', path: '/api/admin/users/doctors', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/doctors/:id', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/doctors/:id/verify', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/doctors/:id/deactivate', authRequired: true },
            { method: 'GET', path: '/api/admin/users/patients', authRequired: true },
            { method: 'POST', path: '/api/admin/users/patients', authRequired: true },
            { method: 'PATCH', path: '/api/admin/users/patients/:id', authRequired: true },
            { method: 'GET', path: '/api/admin/finance/transactions', authRequired: true }
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
        login: '/api/admin/login',
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
