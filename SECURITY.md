# Security Policy — PrimeHealth Microservices

---



## Security Architecture

### Authorization by Role

| Endpoint | PATIENT | DOCTOR | ADMIN |
|----------|---------|--------|-------|
| Book appointment | ✅ | ❌ | ✅ |
| Cancel own appointment | ✅ | ❌ | ✅ |
| Update appointment status | ❌ | ✅ | ✅ |
| Initiate/confirm payment | ✅ | ❌ | ✅ |
| Process refund | ❌ | ❌ | ✅ |
| Update payment status (internal) | Internal only | Internal only | Internal only |
| Download invoice | ✅ (own) | ❌ | ✅ |

### Internal APIs
- `PATCH /api/appointments/:id/payment-status` is an **internal endpoint** — called only by `payment-service`
- In production: add a shared service secret or mutual TLS for internal calls

---

## Environment Variable Security

### Rules
- All secrets stored in `.env` — **never committed to Git**
- `.env.example` contains placeholder values only (no real credentials)
- Production secrets managed via Kubernetes Secrets (`secret.yaml`)
- MongoDB URI always in environment variables — never hardcoded

### Required Files in `.gitignore`
```
.env
*.env
.env.local
.env.production
```

### What Goes Where
| Type | Where |
|------|-------|
| MongoDB URI | `.env` → `MONGO_URI` |
| Service URLs (non-secret) | `configmap.yaml` or `.env` |
| MongoDB URI for K8s | `secret.yaml` (base64 encoded) |
| Nothing | Hardcoded in source code |

---

## Input Validation

All write endpoints use `express-validator`:
- Required fields must be present
- Dates validate as valid ISO dates and not in the past
- Enum fields (status, method) validate against allowed values
- MongoDB ObjectIds validate with regex before database query
- Validation errors return HTTP 400 with field-level error messages

### Validation Error Example
```json
{
  "success": false,
  "message": "Validation failed",
  "data": [
    { "field": "appointmentDate", "message": "Date cannot be in the past" }
  ]
}
```

---

## Dependency Security

```bash
# Check for known vulnerabilities
npm audit

# See outdated packages
npm outdated

# Auto-fix safe updates
npm audit fix
```

Run `npm audit` before every Docker build and Kubernetes deployment.

---

## Docker Security

### Dockerfile Best Practices
- Base image: `node:20-alpine` (minimal attack surface)
- Run as non-root user: `USER node`
- Install only production dependencies: `npm ci --omit=dev`
- Use `.dockerignore` to exclude `.env`, `node_modules`, `*.md`

### docker-compose Security
- Never set `MONGO_URI` in `docker-compose.yml` directly — use `.env` file
- Service ports only exposed to host where needed (internal services can be `expose` not `ports`)

---

## Kubernetes Security

### Secret Management
- MongoDB URIs stored in `k8s/secret.yaml` as base64-encoded strings
- Never hardcode secrets in Deployment YAML files — reference Secret by key:
  ```yaml
  env:
    - name: MONGO_URI
      valueFrom:
        secretKeyRef:
          name: primehealth-secret
          key: MONGO_URI_APPOINTMENT
  ```

### Service Exposure
- Internal services use `ClusterIP` (not accessible from outside cluster)
- Frontend or API Gateway uses `NodePort` or `LoadBalancer` for external access

---

## Code Security Rules

### Forbidden in ALL source files
- No `eval()` — ever
- No `innerHTML` with user-controlled data (XSS vector)
- No secrets, passwords, or API keys in any `.js` file
- No `console.log` of sensitive data (user IDs, payment info) in production

### Payment Security
- Payment-service is the **ONLY** component that marks payment as successful
- Frontend NEVER directly calls `updatePaymentStatus` — it goes through `confirm` endpoint
- Mock gateway in `paymentService.js` — replace with real gateway (PayHere/Stripe) for production
- Invoice PDF only generated for `status: SUCCESS` payments

---

## Supported Versions

| Version | Status |
|---------|--------|
| Current (main) | ✅ Active development |
| < 1.0 | ❌ Not supported |
