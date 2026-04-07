const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ConsultationSession = require('../models/ConsultationSession');
const ChatMessage = require('../models/ChatMessage');
const { canAccessSession } = require('../services/sessionAccess');
const { isChatWindowOpen } = require('../services/chatWindow');
const { normalizeAuthUser, getBearerToken } = require('../middleware/auth');

const getSocketToken = (socket) => {
    const authHeaderToken = getBearerToken(socket.handshake.headers.authorization || '');
    if (authHeaderToken) {
        return authHeaderToken;
    }

    const authToken = socket.handshake.auth?.token;
    return typeof authToken === 'string' ? authToken.trim() : '';
};

const registerSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigin === '*' ? true : env.corsOrigin,
            credentials: true
        }
    });

    io.use((socket, next) => {
        if (!env.jwtSecret) {
            return next(new Error('JWT_SECRET is not configured.'));
        }

        const token = getSocketToken(socket);

        if (!token) {
            return next(new Error('Authentication token is required.'));
        }

        try {
            const payload = jwt.verify(token, env.jwtSecret);
            const user = normalizeAuthUser(payload);

            if (!user.userId || !user.role) {
                return next(new Error('Invalid token payload.'));
            }

            socket.user = user;
            return next();
        } catch (error) {
            return next(new Error('Invalid or expired token.'));
        }
    });

    io.on('connection', (socket) => {
        socket.on('join-session', async ({ sessionId }) => {
            try {
                const session = await ConsultationSession.findById(sessionId);

                if (!session || !canAccessSession(socket.user, session)) {
                    socket.emit('telemedicine:error', { message: 'Access denied for session.' });
                    return;
                }

                socket.join(`session:${session._id}`);
                socket.emit('session:joined', { sessionId: String(session._id) });
            } catch (error) {
                socket.emit('telemedicine:error', { message: error.message });
            }
        });

        socket.on('chat:send', async ({ sessionId, content }) => {
            try {
                const text = String(content || '').trim();

                if (!text) {
                    socket.emit('telemedicine:error', { message: 'Message cannot be empty.' });
                    return;
                }

                const session = await ConsultationSession.findById(sessionId);

                if (!session || !canAccessSession(socket.user, session)) {
                    socket.emit('telemedicine:error', { message: 'Access denied for session.' });
                    return;
                }

                if (!isChatWindowOpen(session, new Date(), env.chatPreMinutes, env.chatPostMinutes)) {
                    socket.emit('telemedicine:error', { message: 'Chat window is closed for this session.' });
                    return;
                }

                const message = await ChatMessage.create({
                    sessionId: session._id,
                    senderId: socket.user.userId,
                    senderRole: socket.user.role,
                    content: text,
                    deliveryChannel: 'socket'
                });

                io.to(`session:${session._id}`).emit('chat:new', {
                    id: message._id,
                    sessionId: message.sessionId,
                    senderId: message.senderId,
                    senderRole: message.senderRole,
                    content: message.content,
                    sentAt: message.sentAt
                });
            } catch (error) {
                socket.emit('telemedicine:error', { message: error.message });
            }
        });
    });

    return io;
};

module.exports = {
    registerSocketServer
};
