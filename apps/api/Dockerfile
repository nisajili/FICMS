# FICMS API – production image
# Multi-stage. Requires outbound access to the npm registry and Prisma engine CDN
# for `prisma generate` (standard deployment assumption).
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/bin

# Install deps (lockfile)
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile

# Build shared packages then the API
RUN pnpm --filter @ficms/config build \
 && pnpm --filter @ficms/types build \
 && pnpm --filter @ficms/ui build
RUN pnpm --filter @ficms/api db:generate
RUN pnpm --filter @ficms/api build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules

USER node
EXPOSE 4000
CMD ["sh", "-c", "cd /app/apps/api && npx prisma migrate deploy && node dist/main.js"]
