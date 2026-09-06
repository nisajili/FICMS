-- Break-glass emergency access for platform administrators
-- See: docs/security-checklist.md (emergency / break-glass access)

-- Create the status enum (idempotent via DO block not used; enum create is one-time).
CREATE TYPE "BreakGlassStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- Create the grant table.
CREATE TABLE "BreakGlassGrant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "revokedById" UUID,
    "reason" TEXT NOT NULL,
    "status" "BreakGlassStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BreakGlassGrant_pkey" PRIMARY KEY ("id")
);

-- Indexes for fast org/status lookups and per-requester history.
CREATE INDEX "BreakGlassGrant_organizationId_status_idx" ON "BreakGlassGrant"("organizationId", "status");
CREATE INDEX "BreakGlassGrant_requestedById_idx" ON "BreakGlassGrant"("requestedById");

-- Referential integrity.
ALTER TABLE "BreakGlassGrant" ADD CONSTRAINT "BreakGlassGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassGrant" ADD CONSTRAINT "BreakGlassGrant_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassGrant" ADD CONSTRAINT "BreakGlassGrant_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BreakGlassGrant" ADD CONSTRAINT "BreakGlassGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
