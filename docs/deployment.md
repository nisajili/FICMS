# FICMS — Deployment & DevOps

## Supported targets
- Private clinic server
- VPS / dedicated host
- Docker-compatible cloud (AWS, Azure, GCP, DigitalOcean, etc.)
- Kubernetes (via the provided images; adapt Compose for K8s manifests)

The production deployment does **not** depend on development-only services.

## Prerequisites
- Docker + Compose (or a container runtime).
- DNS records for the web and API hosts.
- TLS certificates (Caddy auto-manages via ACME/Let's Encrypt).
- Strong secrets (generate with `openssl rand -base64 48`).

## 1. Configure environment

Copy `.env.prod.example` to `.env` and fill in all values. Never commit `.env`.

```bash
cp .env.prod.example .env
```

## 2. Build & start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Services started: `postgres`, `redis`, `objectstorage` (MinIO/S3), `api`,
`worker`, `web`, `caddy` (TLS reverse proxy). Health checks:
- API: `GET /api/v1/health` → `{ "success": true, "data": { "status": "ok" } }`
- Container probe: `GET /healthz`

## 3. Migrations & bootstrap

On the first deploy the API runs `prisma migrate deploy`. Then create the
platform admin and first organisation via the bootstrap endpoints using
`PLATFORM_BOOTSTRAP_TOKEN`:

```bash
curl -X POST $API_URL/api/v1/bootstrap/platform-admin \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@yourclinic.com","password":"Strong!Password1","name":"Platform Admin","token":"<BOOTSTRAP_TOKEN>"}'

curl -X POST $API_URL/api/v1/bootstrap/organization \
  -H 'Content-Type: application/json' \
  -d '{"name":"Your Clinic","slug":"your-clinic","adminEmail":"admin@yourclinic.com","adminPassword":"Strong!Password1","token":"<BOOTSTRAP_TOKEN>"}'
```

Rotate `PLATFORM_BOOTSTRAP_TOKEN` immediately after initial setup.

## 4. CI/CD

Reference pipeline (see `.github/workflows/`):
1. `pnpm install --frozen-lockfile`
2. `pnpm build` (typecheck + build all)
3. `pnpm test:unit`
4. Security scanning: `pnpm audit`, Trivy/`docker scan`, Prisma report.
5. Build & push images; deploy via `docker compose pull && up -d`.

## 5. Production hardening

- Run the reverse proxy at the edge; terminate TLS; set HSTS.
- Restrict DB/Redis/MinIO ports to internal networks (not published).
- Use a managed Postgres with automated backups, or schedule `pg_dump`.
- Enable RLS policies on isolated tables (see `docs/organization-isolation.md`).
- Provision S3-compatible storage with lifecycle policies & private ACLs.
- Set `COOKIE_SECURE=true`, strong JWT secrets, and a unique bootstrap token.
- Configure real SMTP/SMS/payment provider secrets externally.

See also:
- `docs/backup-restore.md`
- `docs/rollback.md`
- `docs/compliance-checklist.md`
- security ([`docs/security-checklist.md`](security-checklist.md)).
