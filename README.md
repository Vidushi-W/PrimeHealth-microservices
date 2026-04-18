# PrimeHealth — AI-Enabled Smart Healthcare Appointment & Telemedicine Platform

**PrimeHealth** is a **microservices-based** smart healthcare system for **Distributed Systems** coursework: it combines a **React** frontend with multiple **Node.js / Express** services, **MongoDB** persistence, **Docker** orchestration, and optional **Kubernetes** manifests. The platform supports **patients**, **doctors**, and **admins** across appointments, payments, telemedicine, prescriptions, and analytics.

---

## Project Overview

PrimeHealth coordinates **online and in-person care** through:

- **Patient-facing** registration, profiles, health artefacts (reports, timeline), **AI-assisted symptom checking**, risk scoring, reminders, and booking.
- **Doctor-facing** profiles, **availability / scheduling**, patient insights, **prescriptions** (dedicated service), reviews, notifications, and earnings views.
- **Appointment & payment** flows with status sync and **PayHere**-hosted checkout (sandbox configurable).
- **Telemedicine** with **Jitsi** video and **per-session chat**, plus **admin / analytics** for platform oversight.

Communication is primarily **REST**. **Telemedicine** may use **WebSockets (Socket.io)** alongside REST for realtime behaviour where enabled.

---

## Key Features

### 1. Patient module + AI symptom checker

- Register / login (**JWT**)
- Profile and **multi-profile (family)** support
- Upload medical reports, **health timeline**, report analysis hooks
- **Symptom check** and **risk score** APIs (implemented in **patient-service**)
- **Reminder** CRUD and “upcoming” listing

### 2. Doctor module + prescription management

- Doctor registration, profile updates, **profile photo** upload
- **Availability** and slot management (add, update, delete slots)
- **Prescription** creation and retrieval via **prescription-service** (by patient / doctor)
- **Patient summary / insights** where wired to internal APIs
- **Reviews / ratings**, **notifications**, **earnings** summaries

> **Roadmap / partial:** features such as **voice-to-prescription** or advanced “smart scheduling” may be **planned or partially implemented**—verify in the UI and service routes for your demo revision.

### 3. Appointment + payment module

- Create, list, filter, and **cancel** appointments; status updates for doctors/admins
- **Payment initiation** (PayHere or simulated path), **confirm**, **history**, **invoice** download where applicable
- **Queue** position API for patients (where exposed)
- Internal **payment-status** sync into appointments (service token when configured)

> **Roadmap:** “AI-based doctor recommendation” and “rescheduling intelligence” may appear as **UI or future logic**—confirm against `appointment-service` and frontend for the branch you evaluate.

### 4. Telemedicine module + analytics / admin

- **Video** consultation via **Jitsi** (`external_api.js`); **session chat** REST APIs
- Session lifecycle: create, list, join, start, end, cancel; **video token** for embedded meet
- **Admin & analytics** service: user management, doctor verification, **analytics summary**, audit / finance views (**RBAC**)

> **Optional / roadmap:** full **session recording**, **live clinical notes**, and rich **file sharing** beyond chat may be **configuration or future work**—see `RECORDING_ENABLED` and service READMEs.

---

## System Architecture Overview

```text
┌─────────────┐     HTTPS/HTTP      ┌──────────────────────────────────────┐
│  React SPA  │ ──────────────────► │  Microservices (REST + WS where used) │
│ <frontend-  │                     │  patient | doctor | appointment |      │
│   folder>   │ ◄──────────────────│  payment | prescription | telemed |  │
└─────────────┘                     │  admin-analytics                      │
                                    └──────────────┬───────────────────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │  MongoDB (per service DB)   │
                                    └─────────────────────────────┘
```

- **Decomposition:** Each bounded context runs as its own service with its own Mongo database name/URI in Docker.
- **Integration:** HTTP between services (e.g. payment → appointment); **internal token** header for privileged internal routes when `INTERNAL_SERVICE_TOKEN` is set.
- **Edge:** Root `docker-compose.yml` includes an **api-gateway** placeholder context; the **full** stack lives under `micro-services/docker/docker-compose.yml`.

---

## Microservices / Modules

| Service | Folder | Responsibility |
|--------|--------|------------------|
| **Patient** | `micro-services/services/patient-service` | Auth, profiles, family profiles, reports, symptoms, risk, reminders, patient-side appointments |
| **Doctor** | `micro-services/services/doctor-service` | Doctor CRUD, availability, reviews, earnings, notifications, internal sync |
| **Appointment** | `micro-services/services/appointment-service` | Appointments, slots, status, queue, internal payment-status |
| **Payment** | `micro-services/services/payment-service` | Initiate/confirm, PayHere notify, invoices, refunds |
| **Prescription** | `micro-services/services/prescription-service` | Prescription documents by doctor/patient |
| **Telemedicine** | `micro-services/services/telemedicine-service` | Sessions, Jitsi payload, chat |
| **Admin & Analytics** | `micro-services/services/admin-analytics-service` | Admin auth, RBAC, users, analytics, audit, finance |
| **AI symptom (stub)** | `micro-services/services/ai-symptom-checker-service` | Placeholder; runnable symptom flows use **patient-service** |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios |
| Backend | Node.js (≥ 18), Express, Mongoose |
| Database | MongoDB (local container or Atlas) |
| Auth | JWT (patient, telemedicine, admin); header-based identity on some services |
| Payments | PayHere (hosted checkout + signed notify) |
| Video | Jitsi Meet (default `meet.jit.si`) |
| Containers | Docker, Docker Compose |
| Orchestration (optional) | Kubernetes (`k8s/`, `micro-services/k8s/`) |

---

## Project Folder Structure

```text
<repo-root>/
├── README.md                          # This file
├── .env                               # Local secrets (DO NOT commit real credentials)
├── docker-compose.yml                 # Slim stack: mongo + doctor + appointment + payment + gateway + frontend
├── Frontend_UI/                       # <frontend-folder> — React (Vite) SPA
├── micro-services/
│   ├── docker/
│   │   └── docker-compose.yml         # <docker-compose-full-path> — full platform
│   ├── services/                      # <backend-folder> — all Node microservices
│   ├── k8s/                           # <k8s-manifest-path-micro>
│   └── api-gateway/                   # Gateway build context (minimal)
└── k8s/                               # <k8s-manifest-path-root>
```

---

## Prerequisites

- **Docker Desktop** (Windows/macOS) or Docker Engine + **Compose V2**
- **Node.js ≥ 18** and **npm** (manual local run)
- **Git**
- For Kubernetes: **kubectl** + a cluster (**minikube**, **kind**, or cloud)
- Optional: **MongoDB Atlas** account if using `ADMIN_MONGO_URI` for admin service

---

## Environment Variables / `.env` Setup

1. At the **repository root**, create a file named **`.env`** (same level as `README.md`).
2. **Never commit** real passwords, production PayHere secrets, or personal Atlas URIs to a public repo.

**Typical variables (use your own values):**

| Variable | Description |
|----------|-------------|
| `<jwt-secret>` / `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `ADMIN_MONGO_URI` | Mongo URI for **admin-analytics-service** (`<mongo-uri>` for admin DB) |
| `MONGO_URI_DOCTOR`, `MONGO_URI_PATIENT`, `MONGO_URI_APPOINTMENT`, `MONGO_URI_PAYMENT`, `MONGO_URI_PRESCRIPTION`, `TELEMEDICINE_MONGO_URI` | Per-service Mongo URIs (defaults work with single Docker Mongo host) |
| `INTERNAL_SERVICE_TOKEN` | Shared secret for internal sync routes |
| `PAYMENT_PROVIDER`, `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_USE_SANDBOX`, `PAYHERE_NOTIFY_URL`, `PAYHERE_FRONTEND_BASE_URL` | PayHere integration |
| `CORS_ORIGIN` | Allowed browser origin(s) |

**Frontend** (`Frontend_UI/.env.local` — optional, not committed):

```env
VITE_PATIENT_API_URL=http://localhost:<patient-service-port>
VITE_DOCTOR_API_URL=http://localhost:<doctor-service-port>
VITE_APPOINTMENT_API_URL=http://localhost:<appointment-service-port>
VITE_PAYMENT_API_URL=http://localhost:<payment-service-port>
VITE_PRESCRIPTION_API_URL=http://localhost:<prescription-service-port>
VITE_TELEMEDICINE_API_URL=http://localhost:<telemedicine-service-port>
VITE_ADMIN_API_URL=http://localhost:<admin-service-port>
```

Default ports used by the frontend code match the **full** Docker stack (see table below).

---

## How to Run with Docker

### A. Full platform (recommended for evaluation)

Path: **`<docker-compose-full-path>`** = `micro-services/docker/docker-compose.yml`

```bash
git clone <your-repo-url>
cd PrimeHealth-microservices
# Create and edit .env at repo root (JWT, Mongo URIs, PayHere, INTERNAL_SERVICE_TOKEN)
cd micro-services/docker
docker compose up --build
```

Starts: **MongoDB**, **admin-analytics**, **doctor**, **patient**, **appointment**, **payment**, **prescription**, **telemedicine**.

### B. Slim stack (subset for quick demo)

From **repo root** (`<docker-compose-path>` = `docker-compose.yml`):

```bash
docker compose up --build
```

Starts: two Mongo instances, **doctor**, **appointment**, **payment**, **api-gateway**, **frontend** (nginx on port **3000**). Does **not** include patient / telemedicine / admin from this file.

### Verify containers

```bash
docker compose ps
docker logs <container-name>
```

### Access

| Stack | Frontend URL |
|-------|----------------|
| Slim (root compose) | `http://localhost:3000` |
| Full + Vite dev | Run `npm run dev` in `Frontend_UI` → usually `http://localhost:5173` with `.env.local` pointing to published ports |

### Backend health checks (examples)

- `http://localhost:<appointment-service-port>/health`
- `http://localhost:<payment-service-port>/health`
- `http://localhost:<telemedicine-service-port>/health`

### Stop safely

```bash
# From the same directory where you ran `docker compose up`
docker compose down
# Optional: remove volumes
docker compose down -v
```

---

## How to Run with Kubernetes

Manifests live under **`<k8s-manifest-path-root>`** (`k8s/`) and **`<k8s-manifest-path-micro>`** (`micro-services/k8s/`), plus per-service folders such as `micro-services/services/telemedicine-service/k8s/`.

**General steps:**

1. Point `kubectl` to your cluster: `kubectl config use-context <your-context>`
2. Create **namespace / secrets / configmaps** as required by your manifests (e.g. `primehealth-secret.yaml`, `primehealth-configmap.yaml`).
3. Apply workloads in dependency order (Mongo → app services → ingress if any):

```bash
kubectl apply -f k8s/primehealth-secret.yaml
kubectl apply -f k8s/primehealth-configmap.yaml
kubectl apply -f k8s/mongodb-appointment.yaml
kubectl apply -f k8s/mongodb-payment.yaml
kubectl apply -f k8s/appointment-service.yaml
kubectl apply -f k8s/payment-service.yaml
kubectl apply -f k8s/doctor-service.yaml
# Add micro-services/k8s/*.yaml as needed for your demo
```

4. **Verify:**

```bash
kubectl get pods
kubectl get svc
kubectl describe pod <pod-name>
kubectl port-forward svc/<service-name> <local-port>:<target-port>
```

5. **Remove** (example): `kubectl delete -f <manifest-file.yaml>` or delete the namespace.

> **Note:** You must build/push **container images** referenced by manifests (or use local image loaders with minikube/kind). Align secrets with `<jwt-secret>` and `<mongo-uri>` values.

---

## How to Run Locally Without Docker

### 1. MongoDB

- Install MongoDB locally **or** use **Atlas** and note `<mongo-uri>` for each service.

### 2. Backend services (`<backend-folder>` = `micro-services/services/<service-name>`)

In **separate terminals**, for each service:

```bash
cd micro-services/services/patient-service
npm install
# Create .env with PORT=5001, MONGO_URI=<mongo-uri>, JWT_SECRET=<jwt-secret>
npm run dev
```

Repeat with the correct **PORT** / **MONGO_URI** for:

| Service | Dev command | Default PORT (local) |
|---------|-------------|----------------------|
| patient-service | `npm run dev` | `5001` (use **5007** on host if avoiding clash with admin) |
| doctor-service | `npm run dev` | `5002` |
| appointment-service | `npm run dev` | `5003` |
| payment-service | `npm run dev` | `5004` |
| prescription-service | `npm run dev` | `5005` |
| telemedicine-service | `npm run dev` | `5003` in container; use **5006** on host to match frontend defaults |
| admin-analytics-service | `npm run dev` | `5001` |

> Avoid running **patient** and **admin** both on port **5001** on the same machine without changing one service’s `PORT` and updating the frontend `.env.local`.

### 3. React frontend (`<frontend-folder>` = `Frontend_UI`)

```bash
cd Frontend_UI
npm install
npm run dev
```

Open **http://localhost:5173** (Vite default). Configure **`.env.local`** so API base URLs match the ports you started.

---

## Service Ports / URLs

When using **`micro-services/docker/docker-compose.yml`** (host → container):

| Service | Host port | Container port | Example base URL |
|---------|-----------|----------------|------------------|
| Admin & Analytics | **5001** | 5001 | `http://localhost:5001` |
| Doctor | **5002** | 5002 | `http://localhost:<doctor-service-port>` |
| Appointment | **5003** | 5003 | `http://localhost:<appointment-service-port>` |
| Payment | **5004** | 5004 | `http://localhost:<payment-service-port>` |
| Prescription | **5005** | 5005 | `http://localhost:<prescription-service-port>` |
| Telemedicine | **5006** | 5003 | `http://localhost:<telemedicine-service-port>` |
| Patient | **5007** | 5001 | `http://localhost:<patient-service-port>` |
| MongoDB | **27017** | 27017 | `mongodb://localhost:27017` |
| API Gateway (root compose only) | **5000** | 5000 | `http://localhost:5000` |
| Frontend nginx (root compose) | **3000** | 80 | `http://localhost:3000` |

**Swagger / docs (where enabled):**

- Appointment: `/api-docs`
- Payment: `/api/docs`
- Prescription: `/api-docs`

---

## Default User Roles

- **Patient** — self-service health, bookings, payments (as implemented in UI).
- **Doctor** — schedule, clinical workspace, prescriptions via API.
- **Admin** — platform management; **RBAC** roles (e.g. super admin, operations, finance) in admin-analytics-service.

Create the first admin via documented **bootstrap** or **registration** flows in the admin service; use **strong passwords** for demos.

---

## Deployment Steps

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd PrimeHealth-microservices
   ```

2. **Set up environment files**

   - Copy or create **`.env`** at the repo root.
   - Fill `<jwt-secret>`, `<mongo-uri>` values, PayHere sandbox keys if testing payments, and `INTERNAL_SERVICE_TOKEN` for internal APIs.
   - Optionally add **`Frontend_UI/.env.local`** with `VITE_*` URLs.

3. **Start Docker Desktop**

   - Launch **Docker Desktop** and wait until the engine reports **running**.

4. **Run Docker Compose**

   - **Full stack:**  
     `cd micro-services/docker` → `docker compose up --build`  
   - **Slim stack:** from repo root → `docker compose up --build`

5. **Verify containers are running**

   - `docker compose ps` — all relevant services should be **Up**.
   - `docker logs <container_name>` if a service exits.

6. **Access the frontend**

   - Slim stack: **http://localhost:3000**
   - Full stack + hot reload: **http://localhost:5173** after `npm run dev` in `Frontend_UI`

7. **Access backend services**

   - Use **health** endpoints and **Swagger** URLs from the ports table.
   - Send **Authorization: Bearer** JWT where required (patient, telemedicine, admin).

8. **Kubernetes (if required for the module)**

   - `kubectl apply -f <k8s-manifest-path-root>/...` and/or `micro-services/k8s/...`
   - `kubectl get pods,svc` to verify; `kubectl port-forward` to test.

9. **Stop the system safely**

   - In the compose directory: `docker compose down`  
   - Optional: `docker compose down -v` to remove named volumes.

---

## Deliverables Included

- This **README** with deployment and run instructions  
- **React** frontend (`Frontend_UI/`)  
- **Microservices** source (`micro-services/services/`)  
- **Docker Compose** (root + `micro-services/docker/`)  
- **Kubernetes** sample manifests (`k8s/`, `micro-services/k8s/`)  
- **REST** APIs; **WebSockets** where enabled (telemedicine)

---

## Team Members and Contributions

| Team member | Primary ownership |
|-------------|-------------------|
| **J.V.S.Weerasinghe** | Doctor module + prescription management |
| **M.A.T.S.Meewalaarachchi** | Patient module + AI symptom checker |
| **H.G.S.Dias** | Telemedicine module + analytics / admin service |
| **W.D.S.G.S.Sasanka** | Appointment + payment module |

Fine-grained contributions: see **Git history** and branches.

---

## Conclusion

PrimeHealth demonstrates a **realistic microservices** design for smart healthcare: **React** on the client, **Node.js** services on the server, **MongoDB** for persistence, **Docker** for reproducible local deployment, optional **Kubernetes** for orchestration demos, and integrations (**PayHere**, **Jitsi**) suitable for academic evaluation. Use **`micro-services/docker/docker-compose.yml`** for the **fullest** local experience; use the **root** compose for a **lighter** appointment/payment path; use **manual** runs when debugging a single service.
