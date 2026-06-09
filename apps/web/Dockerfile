# Build context is the repo root (pnpm workspace).
FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY libs/contracts/ libs/contracts/
COPY apps/web/ apps/web/
RUN pnpm --filter web build

# Runtime stage: only production deps + the built output (the SSR entry imports framework
# code from node_modules at runtime, so prod deps must be present).
FROM node:24-bookworm-slim AS runtime
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /repo/apps/web/dist apps/web/dist

WORKDIR /repo/apps/web
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "exec", "srvx", "--prod", "-s", "dist/client", "dist/server/server.js"]
