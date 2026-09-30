# The API image. It also runs migrations and the reference seed (see docker-compose.prod.yml → migrate).
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
# prisma generate reads the URL but never connects during a build.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY . .
RUN pnpm install --frozen-lockfile --filter "@reberon/api..." --filter "@reberon/db..."
RUN pnpm --filter "@reberon/api..." run build

FROM base AS runtime
ENV NODE_ENV=production PORT=4000 STORAGE_LOCAL_DIR=/data/storage
COPY --from=build /app /app
RUN mkdir -p /data/storage && chown -R node:node /data
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:4000/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/main.js"]
