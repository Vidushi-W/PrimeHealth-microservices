
# PrimeHealth Microservices

## Repository layout

- `micro-services/docker` — Docker assets
- `micro-services/k8s` — Kubernetes manifests
- `micro-services/services/` — Backend microservice projects
- `Frontend_UI/` — Frontend application

## Service module structure

Each member works only in their service. Follow the same structure inside each service:

- `controllers/`
- `routes/`
- `models/`
- `services/`
- `config/`

## Services

- patient-service
- doctor-service
- appointment-service
- payment-service
- telemedicine-service
- admin-analytics-service
- ai-symptom-checker-service
- prescription-service

## Note (Windows)

If a top-level `services` folder still appears next to `micro-services`, it may be leftover empty directories locked by an editor or terminal. Close anything using those paths, then remove the empty `services` folder—canonical path is `micro-services/services/`.
