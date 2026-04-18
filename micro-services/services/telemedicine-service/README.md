# Telemedicine Service

Secure real-time telemedicine microservice for PrimeHealth with:

- Video consultation session orchestration
- Third-party video integration support (Jitsi, Twilio, Agora)
- JWT-secured access control for doctor/patient/admin
- Chat support before, during, and after consultation
- REST + Socket.IO real-time communication
- Docker and Kubernetes deployment files

## Features

1. Consultation session lifecycle:
	 - Create, view, list
	 - Start, end, cancel
2. Video provider token/session generation:
	 - `jitsi`: room URL
	 - `twilio`: access token
	 - `agora`: RTC token
3. Chat module:
	 - REST-based chat history and message send
	 - WebSocket-based live message delivery
	 - Configurable pre/post consultation chat windows

## Folder Structure

```text
telemedicine-service/
	src/
		app.js
		config/
			db.js
			env.js
		middleware/
			auth.js
		models/
			ConsultationSession.js
			ChatMessage.js
		routes/
			sessions.js
			chat.js
		services/
			videoProviders.js
			sessionAccess.js
			chatWindow.js
		socket/
			index.js
	k8s/
		deployment.yaml
		service.yaml
	Dockerfile
	.env.example
	package.json
```

## Environment Variables

Copy `.env.example` to `.env` and set values.

```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/primehealth_telemedicine
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*

VIDEO_PROVIDER=jitsi
JITSI_BASE_URL=https://meet.jit.si

TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_ROOM_TTL_SECONDS=3600

AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
AGORA_TOKEN_TTL_SECONDS=3600

CHAT_PRE_MINUTES=30
CHAT_POST_MINUTES=120
```

## Run Locally

```bash
npm install
npm run dev
```

Service starts on `PORT` (default `5002`).

## API Endpoints

Base URL: `/telemedicine`

All endpoints below require `Authorization: Bearer <jwt>`.

### Sessions

- `POST /sessions` (doctor/admin)
- `GET /sessions`
- `GET /sessions/:sessionId`
- `POST /sessions/:sessionId/start`
- `POST /sessions/:sessionId/end`
- `POST /sessions/:sessionId/cancel` (doctor/admin)
- `POST /sessions/:sessionId/video-token`

Example create payload:

```json
{
	"appointmentId": "APT-1001",
	"doctorId": "DOC-5001",
	"patientId": "PAT-7001",
	"scheduledStartAt": "2026-04-06T10:30:00.000Z",
	"scheduledEndAt": "2026-04-06T11:00:00.000Z",
	"provider": "jitsi",
	"metadata": {
		"reason": "Follow-up"
	}
}
```

### Chat (before/after consultation)

- `GET /chat/:sessionId/messages?limit=50`
- `POST /chat/:sessionId/messages`

Example send payload:

```json
{
	"content": "Hello doctor, I uploaded my latest reports."
}
```

Chat is allowed from:

- `scheduledStartAt - CHAT_PRE_MINUTES`
- until `endedAt + CHAT_POST_MINUTES` (or scheduled end fallback)

## Socket.IO Events

Authenticate via:

- Header: `Authorization: Bearer <jwt>`
- or handshake auth: `{ token: "<jwt>" }`

Client events:

- `join-session` `{ sessionId }`
- `chat:send` `{ sessionId, content }`

Server events:

- `session:joined`
- `chat:new`
- `telemedicine:error`

## Docker

Build and run:

```bash
docker build -t telemedicine-service .
docker run -p 5002:5002 --env-file .env telemedicine-service
```

## Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Update the secret values in `k8s/deployment.yaml` before production deployment.
