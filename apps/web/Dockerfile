# Build context is the repo root (pnpm workspace). Single stage: the SSR server entry
# imports framework code from node_modules at runtime, so we keep them in the image.
FROM node:24-bookworm-slim
WORKDIR /repo
RUN corepack enable

# Install against workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Copy sources and build.
COPY libs/contracts/ libs/contracts/
COPY apps/web/ apps/web/
RUN pnpm --filter web build

WORKDIR /repo/apps/web
ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "exec", "srvx", "--prod", "-s", "dist/client", "dist/server/server.js"]
