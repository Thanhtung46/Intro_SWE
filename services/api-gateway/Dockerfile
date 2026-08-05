# services/api-gateway — Express 4.19.2
# Build context MUST be the monorepo root (../..) so pnpm can resolve
# packages/* workspace dependencies.
ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-slim AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /repo

# Populate the pnpm store from the lockfile only, so this layer stays
# cached across builds until the lockfile changes.
FROM base AS fetch
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

FROM fetch AS build
COPY . .
RUN pnpm install --recursive --offline --frozen-lockfile
RUN pnpm --filter api-gateway run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/services/api-gateway
EXPOSE 4000
CMD ["pnpm", "start"]
