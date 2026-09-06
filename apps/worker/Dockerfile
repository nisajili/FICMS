# FICMS background worker – production image
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV PNPM_HOME=/usr/local/bin

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @ficms/config build \
 && pnpm --filter @ficms/types build \
 && pnpm --filter @ficms/ui build
RUN pnpm --filter @ficms/worker build

FROM node:20-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY --from=base /app/apps/worker ./apps/worker
COPY --from=base /app/packages ./packages
COPY --from=base /app/node_modules ./node_modules
USER node
CMD ["node", "/app/apps/worker/dist/index.js"]
