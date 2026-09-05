# FICMS web – production Next.js image (standalone output)
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/bin
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ficms/config build \
 && pnpm --filter @ficms/types build \
 && pnpm --filter @ficms/ui build
RUN pnpm --filter @ficms/web build

# ---- runtime (standalone) ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
RUN mkdir -p apps/web
COPY --from=base /app/apps/web/public ./apps/web/public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
