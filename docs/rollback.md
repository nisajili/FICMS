# FICMS — Deployment Rollback

## Image-level rollback (recommended)

Tag each deployed image with its build identifier (e.g. `git` sha or a
monotonic version). To roll back:

```bash
docker compose -f docker-compose.prod.yml stop api worker web
docker tag $REGISTRY/ficms-api:$NEW $REGISTRY/ficms-api:$PREVIOUS
```

Or, using Compose with an explicit image tag in `.env`:

```bash
# .env
API_IMAGE=your-registry/ficms-api:$PREVIOUS_SHA
```

```bash
docker compose -f docker-compose.prod.yml up -d api worker web caddy
```

## Database rollback

Migrations are **forward-only**. If a migration is incompatible, restore from
backup (see `docs/backup-restore.md`) and then re-deploy the previous image.

Steps:
1. Take a backup **before** applying any migration.
2. If the deploy fails after migrations, restore the pre-deploy backup.
3. Redeploy the previous image.

## Migration safety

- Use `prisma migrate deploy` (idempotent, records applied migrations).
- Never hand-edit applied migration files after they have run.
- Add new changes as new migrations.

## Health checks gate the rollback

After any deploy, verify:
- `GET /api/v1/health` returns 200.
- The web app loads.
- A test login and a dashboard open succeed.

If any check fails, roll back the image and restore the DB backup if
migrations were applied.
