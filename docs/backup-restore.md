# FICMS — Backup & Disaster Recovery

## What to back up

1. **PostgreSQL database** — the system of record (patients, cycles, billing,
   audit, configuration).
2. **Object storage** (MinIO/S3) — uploaded documents, images, reports.
3. **Environment/secrets** — `.env` (kept in a secrets manager, not in code).

Redis is a cache/queue and is **not** the source of truth; it can be rebuilt.
Sessions in the DB will be invalidated on restore (users log in again).

## Automatic backups

The production Compose stack uses persistent volumes. For real backups,
schedule `pg_dump` (Postgres) and sync object storage to a separate bucket/S3.

Example cron (with a management container or host cron):

```bash
# PostgreSQL
docker exec <postgres-container> pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > /backups/ficms-$(date +%F).sql.gz

# Keep last N
find /backups -name 'ficms-*.sql.gz' -mtime +30 -delete
```

Never put backups in the same filesystem/volume as the live data.

## Restore procedure

1. Stop the API & worker to avoid writes during restore:
   ```bash
   docker compose -f docker-compose.prod.yml stop api worker
   ```
2. Restore the DB:
   ```bash
   # Drop & recreate the DB, then load the dump
   gunzip -c ficms-YYYY-MM-DD.sql.gz | docker exec -i <postgres-container> \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
   ```
3. Restore object storage from the snapshot/standalone bucket.
4. Restart the stack and verify health:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   curl -sf https://$PUBLIC_API_HOST/api/v1/health
   ```
5. Perform a smoke test: sign in, open a patient, open the dashboard.

## Verification

- Periodically test restoring a copy into a non-production environment.
- Verify `prisma migrate deploy` runs clean on a fresh DB (see goal #33).
- Confirm audit events survive a restore (immutability).

## Point-in-time / multi-org restore

For per-org restore (single clinic), extract only that org's rows from a full
dump. For platform-level restores (all orgs), restore the full dump. Always
preserve the `AuditEvent` and `Session` tables' integrity.
