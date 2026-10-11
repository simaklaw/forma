# Build from repository root. Match package.json's Node >=22 requirement.
FROM node:22-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/sync-contract/package.json packages/sync-contract/package.json
# tsx is required at runtime; keep the API's dev dependencies installed.
# Override the mobile hoisted layout so unrelated lockfile packages stay out.
RUN pnpm install --frozen-lockfile --filter @forma/api... --config.node-linker=isolated
COPY apps/api/src apps/api/src
COPY packages/sync-contract/src packages/sync-contract/src
COPY --chmod=755 scripts/start-api-container.sh /usr/local/bin/start-api
ENV NODE_ENV=production
ENV PORT=8787
USER node
EXPOSE 8787
WORKDIR /app/apps/api
ENTRYPOINT ["start-api"]
CMD ["node", "--import", "tsx", "src/server.ts"]
