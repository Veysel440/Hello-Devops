# Hello DevOps

Fast, minimal Node.js + TypeScript API with **Docker**, **MySQL**, **Prometheus/Grafana/Loki**, and **GitHub Actions**. Designed to learn and practice core DevOps flows: CI, security scanning, observability, releases, and simple deploy.

---

## Stack

- **Runtime:** Node.js 20, TypeScript, Fastify
- **Database:** MySQL 8
- **Observability:** Prometheus, Grafana, Loki, Promtail, cAdvisor (optional)
- **Security (CI):** Trivy (FS/Image), Gitleaks, Dependabot
- **Packaging:** Docker, GHCR
- **Release/Deploy:** SemVer tags, GitHub Actions, single-VM Compose

---

## Features

- `/healthz` health endpoint
- `/metrics` Prometheus metrics (HTTP + DB histograms)
- Rate limit, CORS, centralized error handler
- CRUD sample: `/v1/notes`
- DB migrations (auto-run migrator service in Compose)
- Production-ready Dockerfile (multi-stage + prune)

---

## Repository Layout

```bash
├─ src/
│ ├─ server.ts # Fastify app, routes, metrics, rate limit, CORS
│ ├─ db.ts # MySQL pool + DB metrics helper
│ ├─ migrate.ts # Creates 'notes' table
│ ├─ config.ts # Env parsing & validation (zod)
│ ├─ errors.ts # Standardized error responses
│ └─ schemas.ts # Zod schemas for validation
├─ infra/
│ └─ monitoring/
│ ├─ prometheus.yml # Prometheus scrape config
│ ├─ promtail.yml # Log collector config
│ └─ datasources.yml # Grafana data sources (Prometheus, Loki)
├─ Dockerfile
├─ docker-compose.yml
├─ .github/
│ └─ workflows/
│ ├─ ci.yml # build + image push
│ ├─ security.yml # Trivy + Gitleaks
│ ├─ release.yml # SemVer-tag image publishing
│ └─ deploy.yml # optional SSH deploy to VM
├─ .dockerignore
├─ tsconfig.json
├─ package.json
└─ .env.example
```

---

## Requirements

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20 + PNPM (for local dev)
- GitHub account (for Actions/GHCR)

---

## Environment

Copy and adjust:

Default `.env` keys:

| Key             | Description                    | Default           |
| --------------- | ------------------------------ | ----------------- |
| PORT            | API port                       | 8080              |
| DB_HOST         | MySQL host                     | `mysql` (Compose) |
| DB_PORT         | MySQL port                     | 3306              |
| DB_NAME         | Database name                  | app               |
| DB_USER         | Database user                  | app               |
| DB_PASS         | Database password              | app               |
| RATE_LIMIT_MAX  | Requests per window            | 60                |
| RATE_LIMIT_TIME | Window in ms                   | 60000             |
| CORS_ORIGINS    | `*` or comma-separated origins | `*`               |

> **Container vs Host DB**
>
> - API **inside Docker** → `DB_HOST=mysql`, `DB_PORT=3306`
> - API **on host**, DB **in Docker** with port published → `DB_HOST=127.0.0.1` (or `localhost`), `DB_PORT=<published e.g. 3307>`
> - On Windows from container to host DB → `DB_HOST=host.docker.internal`

---

## Run (Docker, recommended)

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:8080/healthz
curl http://localhost:8080/v1/notes
```

## Run (Local dev without Docker)

```bash
pnpm i
pnpm build
# ensure a MySQL server is reachable per your .env
pnpm migrate
pnpm dev
```

## API

- GET /healthz → { ok: true }

- GET /v1/notes → list latest 50 notes

- GET /v1/notes/:id → get by id

- POST /v1/notes → { msg: string } create (201)

- PATCH /v1/notes/:id → { msg?: string } update

- DELETE /v1/notes/:id → 204
