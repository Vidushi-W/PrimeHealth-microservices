# 🏥 PrimeHealth Microservices

> AI-enabled smart healthcare platform built with Node.js microservices, MongoDB, Docker, and Kubernetes.
> **SE3020 Distributed Systems — BSc (Hons) IT Year 3 Assignment (25% of final grade)**

---

## 🗂 Repository Layout

```
PrimeHealth-microservices-main/
├── CLAUDE.md                    # Agent control center — read before coding
├── design.md                    # UI design system spec
├── agent/                       # Session memory (BRIEF, MEMORY, TODO, CLAUDE)
├── agents/                      # Multi-tool orchestration workflows
├── claude/                      # Claude Code agents, commands, rules, skills
├── docs/
│   └── Sithmi_Guide.md          # Appointment + Payment full developer guide
├── Frontend_UI/                 # Dark-mode testing UI (HTML/CSS/JS)
├── micro-services/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   ├── k8s/                     # Kubernetes manifests
│   └── services/
│       ├── doctor-service/      # Port 5002
│       ├── appointment-service/ # Port 5003 — Sithmi
│       ├── payment-service/     # Port 5004 — Sithmi
│       └── prescription-service/# Port 5005
```

---

## 👥 Team & Module Ownership

| Member | Module | Port |
|--------|--------|------|
| **Sithmi** | appointment-service + payment-service | 5003, 5004 |
| Sinali | patient-service + AI symptom checker | 5001, — |
| Vidushi | doctor-service + prescription-service | 5002, 5005 |
| Geethma | telemedicine-service + admin-analytics | —, — |

---

## 🚀 Quick Start

### Option A — Run Individually (Local Dev)

```bash
# Terminal 1 — Appointment Service
cd micro-services/services/appointment-service
cp .env.example .env        # Edit MONGO_URI
npm install
npm run dev                  # Starts on :5003

# Terminal 2 — Payment Service
cd micro-services/services/payment-service
cp .env.example .env        # Edit MONGO_URI
npm install
npm run dev                  # Starts on :5004
```

### Option B — Docker Compose

```bash
cd micro-services/docker
cp .env.example .env        # Set MONGO_URI_APPOINTMENT and MONGO_URI_PAYMENT
docker-compose up --build
```

### Option C — Kubernetes

```bash
cd micro-services/k8s
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f appointment-deployment.yaml -f appointment-service.yaml
kubectl apply -f payment-deployment.yaml -f payment-service.yaml
kubectl get pods
```

### Open Frontend

```bash
open Frontend_UI/index.html   # Or use Live Server in VS Code
```

---

## 🔌 Service Endpoints

### appointment-service (`:5003`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/appointments` | — | Book appointment |
| `GET` | `/api/appointments/my` | PATIENT | My appointments |
| `GET` | `/api/appointments/doctor/:id/slots?date=` | — | Available slots |
| `GET` | `/api/appointments` | ADMIN | All appointments |
| `GET` | `/api/appointments/:id` | — | Single appointment |
| `GET` | `/api/appointments/:id/queue` | PATIENT | Queue position |
| `PATCH` | `/api/appointments/:id/cancel` | PATIENT/ADMIN | Cancel |
| `PATCH` | `/api/appointments/:id/status` | DOCTOR/ADMIN | Update status |
| `PATCH` | `/api/appointments/:id/payment-status` | Internal | Update payment |
| `GET` | `/health` | — | Health check |
| `GET` | `/api-docs` | — | Swagger UI |

### payment-service (`:5004`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/payments/initiate` | — | Initiate payment |
| `POST` | `/api/payments/confirm` | — | Confirm payment |
| `GET` | `/api/payments/my` | PATIENT | My payment history |
| `GET` | `/api/payments/order/:orderId` | — | Get by order ID |
| `GET` | `/api/payments` | ADMIN | All payments |
| `GET` | `/api/payments/:id` | — | Single payment |
| `POST` | `/api/payments/:id/refund` | ADMIN | Process refund |
| `GET` | `/api/payments/:id/invoice` | PATIENT/ADMIN | Download PDF |
| `GET` | `/health` | — | Health check |
| `GET` | `/api/docs` | — | Swagger UI |

---

## 🔐 Mock Authentication

All services use header-based authentication (no JWT tokens for assignment scope):

```
x-user-id: p-123
x-user-role: PATIENT     # PATIENT | DOCTOR | ADMIN
```

---

## 🧪 Quick Test

```bash
# 1. Health checks
curl http://localhost:5003/health
curl http://localhost:5004/health

# 2. Book appointment
curl -X POST http://localhost:5003/api/appointments \
  -H "Content-Type: application/json" \
  -H "x-user-id: p-123" -H "x-user-role: PATIENT" \
  -d '{"patientId":"p-123","doctorId":"d-001","doctorName":"Dr. Smith","specialty":"Cardiology","appointmentDate":"2026-05-01","startTime":"09:00","reason":"Checkup","consultationFee":2000}'

# 3. Initiate payment
curl -X POST http://localhost:5004/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"<from step 2>","patientId":"p-123","amount":2000,"method":"CREDIT_CARD"}'

# 4. Confirm payment
curl -X POST http://localhost:5004/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{"orderId":"<from step 3>"}'

# 5. Verify appointment auto-confirmed
curl http://localhost:5003/api/appointments/<id>
# → status: "CONFIRMED", paymentStatus: "PAID"
```

---

## 📂 Service Module Structure

Each service follows this identical structure (matches `doctor-service` reference):

```
service-name/
├── package.json
├── .env.example
├── Dockerfile
├── .dockerignore
└── src/
    ├── server.js           # Entry point
    ├── app.js              # Express setup
    ├── config/             # db.js, logger.js, swagger.js
    ├── controllers/        # Thin request handlers
    ├── middleware/         # auth, errorHandler, notFound, requestLogger
    ├── models/             # Mongoose schemas
    ├── routes/             # Express routes + Swagger JSDoc
    ├── services/           # Business logic + service clients
    └── utils/              # ApiError, validate, generateOrderId
```

---

## 📚 Documentation

- **`docs/Sithmi_Guide.md`** — complete developer guide for Appointment + Payment module
  - Environment variable setup
  - Architecture diagram
  - All API endpoints with examples
  - 12-step testing guide (curl commands)
  - 49-item assignment checklist
  - 10-day build schedule with GitHub commit messages
- **`/api-docs`** — Swagger UI on appointment-service
- **`/api/docs`** — Swagger UI on payment-service
- **`agent/BRIEF.md`** — requirements and acceptance criteria
- **`agent/MEMORY.md`** — known patterns, decisions, and gotchas

---

## ⚠️ Windows Note

If a top-level `services` folder appears next to `micro-services`, it may be leftover empty directories locked by an editor or terminal. Close anything using those paths, then remove the empty `services` folder — canonical path is `micro-services/services/`.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Language | JavaScript (CommonJS) |
| Database | MongoDB + Mongoose |
| Auth | Header-based mock (`x-user-id`, `x-user-role`) |
| Validation | express-validator |
| Inter-service | Axios HTTP |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Logging | Winston |
| PDF | pdfkit |
| Containers | Docker + docker-compose |
| Orchestration | Kubernetes |
| Frontend | Vanilla HTML + CSS + JS (dark mode) |
