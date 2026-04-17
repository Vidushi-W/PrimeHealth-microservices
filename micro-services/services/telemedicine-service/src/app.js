const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const env = require('./config/env');
const { connectDatabase, isDatabaseReady } = require('./config/db');
const sessionRoutes = require('./routes/sessions');
const chatRoutes = require('./routes/chat');
const { registerSocketServer } = require('./socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
	origin: env.corsOrigin === '*' ? true : env.corsOrigin,
	credentials: true
}));
app.use(express.json({ limit: '1mb' }));

const getServiceReadinessError = () => {
	if (!env.mongoUri) {
		return 'Service configuration missing: MONGO_URI is not set.';
	}

	if (!env.jwtSecret) {
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

app.get('/health', (req, res) => {
	res.json({
		success: true,
		service: 'telemedicine-service',
		status: 'ok',
		dbConnected: mongoose.connection.readyState === 1,
		provider: env.videoProvider
	});
});

app.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'PrimeHealth Telemedicine Service is running.'
	});
});

app.use('/telemedicine/sessions', requireServiceReady, sessionRoutes);
app.use('/telemedicine/chat', requireServiceReady, chatRoutes);

app.use((err, req, res, next) => {
	console.error('Unhandled server error:', err.message);
	return res.status(500).json({
		success: false,
		message: 'Internal server error.'
	});
});

registerSocketServer(server);

connectDatabase().finally(() => {
	server.listen(env.port, () => {
		console.log(`telemedicine-service listening on port ${env.port}`);
	});
});
