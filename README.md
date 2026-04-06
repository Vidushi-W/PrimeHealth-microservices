# PrimeHealth Microservices

## Project Structure

- **Frontend_UI**: Contains the frontend application (React/TS).
- **micro-services**: Contains the backend services and infrastructure.
  - **services**: Individual microservices (Auth, Patient, Appointment, etc.).
  - **docker**: Docker configuration and compose files.
  - **k8s**: Kubernetes manifests.

## Getting Started

To run the application using Docker:

```bash
cd micro-services/docker
docker-compose up --build
```
