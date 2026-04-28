# Contributing to PrimeHealth Microservices

> This is a university assignment project (SE3020 Distributed Systems).
> Contributions are made by the team only, not open to external PRs.

---

## Team Members & Module Ownership

| Member | Module | Port |
|--------|--------|------|
| **W.D.S.G.S.Sasanka** | appointment-service + payment-service | 5003, 5004 |
| M.A.T.S.Meewalaarachchi | patient-service + AI symptom checker | 5001 |
| J.V.S.Weerasinghe | doctor-service + prescription-service | 5002, 5005 |
| H.G.S.Dias | telemedicine-service + admin-analytics | — |

**Rule**: Only touch files in your own service directory. Do not modify another team member's service code.

---

## Before You Start Any Work

1. `git pull origin main` — sync the latest
2. Read `agent/TODO.md` → Last Session section (know what was done)
3. Read `agent/MEMORY.md` → avoid repeating past mistakes
4. Create a feature branch: `git checkout -b feature/[your-task-name]`

---

## Branch Naming

```
feature/[name]   → new feature
fix/[name]       → bug fix
refactor/[name]  → code cleanup without behavior change
docs/[name]      → documentation only
hotfix/[name]    → urgent fix for broken demo
```

**Examples:**
```
feature/queue-position-endpoint
fix/payment-confirm-status-update
docs/sithmi-guide-api-examples
```

---

## Commit Message Format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `style` | CSS/formatting changes (no logic) |
| `refactor` | Code cleanup without behavior change |
| `docs` | Documentation files only |
| `test` | Tests only |
| `chore` | Dependency updates, tooling, scripts |

### Scope — Service or Layer

```
appointment-service   payment-service   doctor-service
frontend              k8s               docker
docs                  auth              api
```

### Good Examples

```
feat(appointment-service): add queue position endpoint
fix(payment-service): prevent double confirm on same orderId
docs(sithmi-guide): add K8s deployment steps
feat(frontend): add invoice download button
chore(k8s): update appointment-service resource limits
```

---

## Service-Specific Rules

### Before Adding Code

- Check `agent/MEMORY.md` → Mistakes section for relevant issues
- Copy structure from `doctor-service` — it is the reference implementation
- All endpoints must have Swagger JSDoc comments (`@swagger`)
- All write endpoints must use `express-validator` for input validation
- All async functions must be wrapped in `try/catch` with `next(err)`

### Code Standards

```javascript
// ✅ Correct — thin controller, throws ApiError
exports.bookAppointment = async (req, res, next) => {
  try {
    const result = await appointmentService.createAppointment(req.body, req.user);
    res.status(201).json({ success: true, message: 'Appointment booked', data: result });
  } catch (err) {
    next(err);
  }
};

// ❌ Wrong — business logic in controller, no error forwarding
app.post('/appointments', async (req, res) => {
  const appt = await Appointment.create(req.body); // no validation, no try/catch
  res.json(appt);
});
```

### Environment Variables

- Copy `.env.example` to `.env` before running
- Never hardcode `MONGO_URI`, service URLs, or any credentials
- In Docker: use container names (e.g., `http://appointment-service:5003`)
- In K8s: use Kubernetes DNS names (e.g., `http://appointment-service:5003`)
- Never `localhost` in Docker or K8s configuration

### Forbidden

- `var` — always use `const` (or `let` if reassigning)
- `import`/`export` — this project uses CommonJS (`require`/`module.exports`)
- Inline styles in HTML (`style="..."`)
- Committing `.env` files
- Hardcoded service URLs in source files
- Frontend changing payment status directly — only `payment-service` may do this

---

## Folder Rules

```
service-name/src/
├── controllers/   → ONLY req/res handling (no DB queries, no business logic)
├── services/      → Business logic, DB queries, calls to other services
├── models/        → Mongoose schemas only
├── routes/        → Express router + Swagger JSDoc + express-validator
├── middleware/    → auth, errorHandler, notFound, requestLogger
├── config/        → db.js, logger.js, swagger.js
└── utils/         → ApiError.js, validate.js, generateOrderId.js
```

Never write DB queries in controllers. Never write req/res handling in services.

---

## Pull Request Process

1. Push your feature branch: `git push origin feature/[name]`
2. Open PR from your branch → `main`
3. PR title: same format as commit message (`feat(scope): description`)
4. PR description:
   - What was done
   - How to test it (curl commands or Frontend steps)
   - Any env variables added
5. At least one teammate reviews before merge
6. All PRs merge via **squash merge** to keep history clean

---

## Testing Your Work

```bash
# Health check
curl http://localhost:5003/health
curl http://localhost:5004/health

# Swagger UI
open http://localhost:5003/api-docs
open http://localhost:5004/api/docs

# Full flow test
# See docs/Sithmi_Guide.md → "Testing Guide" section
```

---

## Updating Agent Files

After every session, update these files before committing:

| File | What to Update |
|------|---------------|
| `agent/TODO.md` | Move completed tasks to Done, add "Last Session" handoff note |
| `agent/MEMORY.md` | Add any new bugs found/fixed, patterns used, or dependencies added |

These updates are **mandatory** — not optional.

---

## Docker & Kubernetes Rules

- Always test locally first (`npm run dev`) before Dockerizing
- Always test Docker before writing K8s manifests
- Never use `localhost` as a service URL in Docker Compose or K8s YAML
- `docker-compose up --build` must succeed before any K8s work

---

## Common Issues

### Service can't connect to MongoDB
- Check `.env` file exists and `MONGO_URI` is set correctly
- Atlas: ensure your IP is whitelisted in Atlas Network Access

### appointment-service can't reach doctor-service
- If local: check DOCTOR_SERVICE_URL in `.env` (should be `http://localhost:5002`)
- If Docker: check docker-compose uses container name (`http://doctor-service:5002`)

### Payment confirm doesn't update appointment
- Check `APPOINTMENT_SERVICE_URL` in payment-service `.env`
- Check appointment-service is running and `/api/appointments/:id/payment-status` is accessible

### Port conflict
- Check nothing else is on the port: `lsof -i :5003` (or `:5004`)
- Kill the conflicting process: `kill -9 <PID>`
